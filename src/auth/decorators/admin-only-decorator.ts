import { applyDecorators, UseGuards } from "@nestjs/common";
import { AdminJwtGuard } from "../admin-jwt.guard";

export function AdminOnly() {
    return applyDecorators(UseGuards(AdminJwtGuard))
}