import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsEmail, IsNotEmpty } from 'class-validator';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export type UserDocument2 = HydratedDocument<User2>;


@Schema()
export class User {
    @Prop({ required: true })
    @IsNotEmpty()
    username: string;
    @Prop({ required: true, unique: true, lowercase: true })
    @IsEmail()
    @IsNotEmpty()
    email: string;
    @Prop({ required: true })
    @IsNotEmpty()
    password: string;
    @Prop({ required: false })
    contractAddress: string;
    @Prop({ required: false, type: Object })
    subscriptionId: object;
    @Prop({ required: false })
    NFTsubscriptionId: string;
    @Prop({ required: false })
    NFTNotification: [any];
}

export class User2 {
    @Prop({ required: true, unique: true, })
    @IsNotEmpty()
    accountAddr: string;
    @Prop({ required: true, unique: true, lowercase: true })
    @Prop({ required: true })
    @IsNotEmpty()
    nounce: string;
    @Prop({ required: false })
    contractAddress: string;
    @Prop({ required: false, type: Object })
    subscriptionId: object;
    @Prop({ required: false })
    NFTsubscriptionId: string;
    @Prop({ required: false })
    NFTNotification: [any];
}
export const UserSchema = SchemaFactory.createForClass(User);
export const UserSchema2 = SchemaFactory.createForClass(User2);
