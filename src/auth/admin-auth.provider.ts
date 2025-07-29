import { JwtService } from "@nestjs/jwt";
import { AdminJwtConfig } from "src/config/jwt.config";

export const AdminAuthProvider = {
  provide: "JWT_ADMIN_SERVICE",
  useFactory: () => {
    return new JwtService(AdminJwtConfig);
  },
};
