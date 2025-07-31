import { JwtService } from "@nestjs/jwt";
import { AdminJwtConfig } from "../config/jwt.config";

export const AdminAuthProvider = {
  provide: "JWT_ADMIN_SERVICE",
  useFactory: () => {
    return new JwtService(AdminJwtConfig);
  },
};
