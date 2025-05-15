import { Body, Controller, Post, UseGuards, Param, Req } from "@nestjs/common";
import { LikesService } from "./likes.service";

@Controller()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  // @UseGuards(JwtAuthGuard)
  @Post(":profileToBeLikedId")
  async likeUser(
    @Param("profileToBeLikedId") profileToBeLikedId: string,
    @Req() req
  ) {
    const myProfileId = req.user.userId;
    const result = await this.likesService.likeProfile(
      myProfileId,
      profileToBeLikedId
    );
    return result;
  }
}
