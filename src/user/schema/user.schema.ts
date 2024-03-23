import { Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import { IsEmail, IsNotEmpty } from 'class-validator';
import { HydratedDocument, Document, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
// export type UserDocument = Document & User;

@Schema()
export class User {
    @Prop({ required: true, unique: true, })
    @IsNotEmpty()
    username: string;
    @Prop({ required: true, unique: true, lowercase: true })
    @IsEmail()
    @IsNotEmpty()
    email: string;
    @Prop({ required: true })
    @IsNotEmpty()
    password: string;
}

@Schema()
export class Product extends Document {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    image: string;

    @Prop({ required: true })
    amount: number;

    @Prop({ type: Types.ObjectId, ref: 'User' }) 
    user: User;
}

export const UserSchema = SchemaFactory.createForClass(User);
export const ProductSchema = SchemaFactory.createForClass(Product);
