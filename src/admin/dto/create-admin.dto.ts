import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
} from "class-validator";

export class CreateAdminDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(6, 64)
  password: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsString()
  @IsNotEmpty({message : "Must contain the admin secret"})
  adminSecret : string
}
