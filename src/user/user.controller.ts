import { Body, Controller, Delete, Get, HttpStatus, Redirect, Param, Post, Headers, Put,Req, Res } from "@nestjs/common";
import { User } from "./schema/user.schema";
import { UserService } from "./user.service";
import { UserDto } from "./dto/user.dto";
import { updateUserdto } from "./dto/user.dto";

@Controller()
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get()
    @Redirect('https://documenter.getpostman.com/view/26141564/2s9Y5VVQWB', 301)
    redirectToWebsite() {}


    @Post('user/signup')
    async Signup(@Res() response, @Body() user: User) {
        const newUSer = await this.userService.signup(user);
        return response.status(HttpStatus.CREATED).json({
            ...newUSer
        })
    }

    @Post('user/signin')
    async SignIn(@Res() response, @Body() user: UserDto) {
        const token = await this.userService.signin(user);
        return response.status(HttpStatus.OK).json(token)
    }

    @Get('user/verify')
    async verifyAuth (@Headers('authorization') authHeader: string,){
        
        return this.userService.verifyAuth(authHeader)
    }

    @Post('user/updateuser')
    async updateuser (@Headers('authorization') authHeader: string, @Body() user: updateUserdto){
        
        return this.userService.updateAndSubscribe(user, authHeader);
    }

    @Post('user/unsubscribe')
    async unsubscribe (@Headers('authorization') authHeader: string,){
        
        return this.userService.UnsubscribeNFTNotifs(authHeader)
    }

    @Post('user/getnotifs')
    async getNFTNotifs (@Headers('authorization') authHeader: string){
        
        return this.userService.getNFTNotification(authHeader);
    }


    @Post('user/proto')
    async proto (@Headers('authorization') authHeader: string){
        
        return this.userService.proto(authHeader);
    }

    @Post('user/test')
    async tests (@Headers('authorization') authHeader: string){
        return this.userService.UnsubscribeNFTNotifs(authHeader);
        // return response.status(HttpStatus.OK).json(userProfile);
    }

}