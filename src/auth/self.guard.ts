// src/auth/guards/self.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';


// A IDEIA É FAZER UM DECORATOR, OU ALGUMA COISA QUE PERMITA QUE SÓ O USER
// QUE DEU MATCH POR EXEMPLO, POSSA ACESSAR AQUELA ROTA

@Injectable()
export class SelfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request | any>();
    const user = request.user;
    const paramId = request.params?.id;

    if (!user || !user._id || !paramId) {
      throw new ForbiddenException('User');
    }

    const isSelf = user._id.toString() === paramId.toString();

    if (!isSelf) {
      throw new ForbiddenException('You can only acess your data');
    }

    return true;
  }
}
