import { applyDecorators, UseGuards } from "@nestjs/common";
import { AdminJwtGuard } from "@/auth/admin-jwt.guard";

export function AdminOnly() {
    return applyDecorators(UseGuards(AdminJwtGuard))
}