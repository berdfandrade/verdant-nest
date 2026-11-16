import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { User } from "@/auth/decorators/user.decorator";
import { DatesService } from "./dates.service";
import { CreateDateInviteDto, ListDatesQueryDto } from "./dto/date-invite.dto";

@ApiTags("📅 Dates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("dates")
export class DatesController {
  constructor(private readonly datesService: DatesService) {}

  @Post()
  async invite(@User() user: any, @Body() dto: CreateDateInviteDto) {
    return this.datesService.invite(user._id, dto);
  }

  @Get()
  async list(@User() user: any, @Query() query: ListDatesQueryDto) {
    return this.datesService.list(user._id, query);
  }

  // Antes de ":id" para "invites" não ser lido como um id
  @Get("invites")
  async receivedInvites(@User() user: any) {
    return this.datesService.receivedInvites(user._id);
  }

  @Get(":id")
  async findOne(@User() user: any, @Param("id") id: string) {
    return this.datesService.findOne(user._id, id);
  }

  @Patch(":id/accept")
  @HttpCode(200)
  async accept(@User() user: any, @Param("id") id: string) {
    return this.datesService.accept(user._id, id);
  }

  @Patch(":id/decline")
  @HttpCode(200)
  async decline(@User() user: any, @Param("id") id: string) {
    return this.datesService.decline(user._id, id);
  }

  @Patch(":id/cancel")
  @HttpCode(200)
  async cancel(@User() user: any, @Param("id") id: string) {
    return this.datesService.cancel(user._id, id);
  }
}
