import {IsEmail, IsNotEmpty} from 'class-validador'

export class AuthDto {
  @IsEmail()
  email : string;

  @IsNotEmpty()
  password : string;
}


