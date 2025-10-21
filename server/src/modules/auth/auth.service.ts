import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async validate(username: string, password: string): Promise<boolean> {
    return username === 'admin' && password === 'admin';
  }
}
