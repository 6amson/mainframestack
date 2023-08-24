import { Body, Controller, Delete, Get, HttpStatus, Redirect, Param, Post, Headers, Put,Req, Res } from "@nestjs/common";
import { User } from "./schema/user.schema";
import { UserService } from "./user.service";
import { UserDto } from "./dto/user.dto";
import { updateUserdto } from "./dto/user.dto";

@Controller()
export class UserController {
    constructor(private readonly userService: UserService) { }

    // @Get()
    // @Redirect('', 301)
    // redirectToWebsite() {}


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

    @Post('user/verify')
    async verifyAuth (@Headers('authorization') authHeader: string,){
        
        return this.userService.verifyAuth(authHeader)
    }

    @Post('user/updateuser')
    async updateuser (@Headers('authorization') authHeader: string, @Body() user: updateUserdto){
        
        return this.userService.findUserAndUpdate(user, authHeader);
    }

    @Post('user/test')
    async testroute (@Res() response, @Headers('authorization') authHeader: string){
        const userProfile = await this.userService.testRoute(authHeader);
        return response.status(HttpStatus.OK).json(userProfile);
    }

}