import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Kullanıcı adı sadece harf, rakam ve _ içerebilir",
  })
  username: string;

  @IsEmail({}, { message: "Geçerli bir e-posta adresi girin" })
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir",
  })
  password: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  displayName?: string;
}
