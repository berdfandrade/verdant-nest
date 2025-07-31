import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    @Inject('JWT_ADMIN_SERVICE')
    private readonly adminJwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        
      const payload = this.adminJwtService.verify(token);
      request['admin'] = payload; 

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired admin token');
    }
  }
}
