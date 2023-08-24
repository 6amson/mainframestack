import { IsEmail, IsNotEmpty } from 'class-validator';


export class UserDto {
    @IsEmail()
    @IsNotEmpty()
    readonly email: string;

    @IsNotEmpty()
    readonly password: string;
}

export class updateUserdto {
    @IsNotEmpty()
    readonly contractAddress: string

    @IsNotEmpty()
    readonly  subscriptionId: object;
}