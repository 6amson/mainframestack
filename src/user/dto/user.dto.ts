import { IsEmail, IsNotEmpty } from 'class-validator';


export class UserDto {
    @IsEmail()
    @IsNotEmpty()
    readonly email: string;

    @IsNotEmpty()
    readonly password: string;
}

export class UpdateProductDto {
    name?: string;
    price?: number;
    description?: string;
    image?: string;
    amount?: number;
}

export class ProductDto {
    name: string;
    price: number;
    description: string;
    image: string;
    amount: number;
}