
import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { SelfGuard } from '../self.guard';

export function SelfOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, SelfGuard)
  );
}
