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
    readonly contractAddress: string;

    @IsNotEmpty()
    readonly  subscriptionId: object;
}

export class metamaskDto {
    @IsNotEmpty()
    readonly accountAddr: string;
}

export class metamaskNonceDto {
    @IsNotEmpty()
    readonly accountAddr: string;
}