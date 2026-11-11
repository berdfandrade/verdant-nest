
import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { SelfGuard } from '@/auth/self.guard';

export function SelfOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, SelfGuard)
  );
}
