const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError, validationError } = require('./errors');

function createAuthModule({ db, jwtSecret, tokenExpiresIn = '1h' }) {
  if (!jwtSecret) {
    throw new Error('jwtSecret is required to initialize authentication');
  }

  const router = express.Router();

  const getUserByUsername = db.prepare(`
    SELECT id, username, role, password_hash, password_reset_required
    FROM users
    WHERE username = ?
  `);

  const getUserById = db.prepare(`
    SELECT id, username, role, password_reset_required
    FROM users
    WHERE id = ?
  `);

  const updatePasswordStmt = db.prepare(`
    UPDATE users
    SET password_hash = ?,
        password_reset_required = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  function mapUserResponse(user) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      requiresPasswordChange: Boolean(user.password_reset_required)
    };
  }

  function generateToken(user, extraClaims = {}) {
    const claims = {
      sub: user.id,
      username: user.username,
      role: user.role,
      passwordResetRequired: Boolean(user.password_reset_required),
      ...extraClaims
    };

    return jwt.sign(claims, jwtSecret, { expiresIn: tokenExpiresIn });
  }

  function authenticate({ allowPasswordReset = false } = {}) {
    return (req, _res, next) => {
      try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
          throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
        }

        const token = authHeader.slice(7);
        let payload;
        try {
          payload = jwt.verify(token, jwtSecret);
        } catch (err) {
          throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
        }

        const user = getUserById.get(payload.sub);
        if (!user) {
          throw new AppError('User not found', 401, 'USER_NOT_FOUND');
        }

        if (user.password_reset_required && !allowPasswordReset) {
          throw new AppError('Password change required', 403, 'PASSWORD_CHANGE_REQUIRED');
        }

        req.user = user;
        req.auth = { tokenPayload: payload };
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  router.post('/login', (req, res, next) => {
    try {
      const { username, password } = req.body || {};

      if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || password.length === 0) {
        throw validationError('Username and password are required', { fields: ['username', 'password'] });
      }

      const user = getUserByUsername.get(username.trim());
      if (!user) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      const matches = bcrypt.compareSync(password, user.password_hash);
      if (!matches) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      const token = generateToken(user);
      const responseUser = mapUserResponse(user);

      res.json({
        token,
        user: responseUser,
        requiresPasswordChange: responseUser.requiresPasswordChange
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/change-password', authenticate({ allowPasswordReset: true }), (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body || {};

      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        throw validationError('New password must be at least 8 characters long', { field: 'newPassword' });
      }

      const userWithHash = getUserByUsername.get(req.user.username);
      if (!userWithHash) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const isFirstLogin = Boolean(userWithHash.password_reset_required);
      if (!isFirstLogin) {
        if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
          throw validationError('Current password is required', { field: 'currentPassword' });
        }

        const currentMatches = bcrypt.compareSync(currentPassword, userWithHash.password_hash);
        if (!currentMatches) {
          throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
        }
      } else if (currentPassword) {
        const currentMatches = bcrypt.compareSync(currentPassword, userWithHash.password_hash);
        if (!currentMatches) {
          throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
        }
      }

      const newMatchesExisting = bcrypt.compareSync(newPassword, userWithHash.password_hash);
      if (newMatchesExisting) {
        throw validationError('New password must be different from the current password', { field: 'newPassword' });
      }

      const hashed = bcrypt.hashSync(newPassword, 10);
      updatePasswordStmt.run(hashed, 0, userWithHash.id);

      const updatedUser = {
        ...userWithHash,
        password_reset_required: 0
      };

      const newToken = generateToken(updatedUser);
      const responseUser = mapUserResponse(updatedUser);

      res.json({
        token: newToken,
        user: responseUser,
        requiresPasswordChange: responseUser.requiresPasswordChange
      });
    } catch (err) {
      next(err);
    }
  });

  return {
    router,
    authenticate,
    generateToken
  };
}

module.exports = {
  createAuthModule
};
