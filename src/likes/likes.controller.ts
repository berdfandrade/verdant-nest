import { Controller, Post, UseGuards, Param, Req } from "@nestjs/common";
import { LikesService } from "./likes.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller('likes')
export class LikesController {

  constructor(private readonly likesService: LikesService) {}

  @Post(":profileToBeLikedId")
  async likeUser( @Param("profileToBeLikedId") profileToBeLikedId: string, @Req() req ) {

    const myProfileId = req.user.userId;
    const result = await this.likesService.likeProfile( myProfileId, profileToBeLikedId );
    return result;
  }

}
