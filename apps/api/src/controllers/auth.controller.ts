import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import { PN, TCP_USERS } from '@app/common/constants';
import { LoginRequest, RegisterRequest, NexPayload } from '@app/common/dto';
import { SessionService } from '../session.service';
import jwt from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '@app/common/errors';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(TCP_USERS) private tcpUsers: ClientProxy,
    private readonly sessionService: SessionService,
  ) {}

  @Post('register')
  async register(@Body() pl: RegisterRequest) {
    return await firstValueFrom(this.tcpUsers.send(PN.register, new NexPayload(pl)));
  }

  @Post('login')
  async login(@Req() req, @Body() pl: LoginRequest, @Res() res) {
    let oldSessionId: string | undefined;
    if (req.cookies.refresh_token) {
      const decoded = jwt.verifyToken(req.cookies.refresh_token);
      if (decoded) {
        oldSessionId = decoded.sessionId;
      }
    }

    const user = await firstValueFrom(this.tcpUsers.send(PN.login, new NexPayload(pl)));
    console.log('User:', user);
    const { access_token, refresh_token } = await this.sessionService.signAndSetSession(user, oldSessionId);
    const { accessTokenCookieOptions, refreshTokenCookieOptions } = await this.sessionService.getCookieOptions();
    res.cookie('access_token', access_token, accessTokenCookieOptions);
    res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions);

    return res.json(user);
  }

  @Get('refresh')
  async refresh(@Req() req, @Res() res) {
    // Get the refresh token from cookie.
    const old_refresh_token = req.cookies.refresh_token as string;

    // Validate the Refresh token.
    const decoded = jwt.verifyToken(old_refresh_token);
    const message = 'Could not refresh access token!';
    if (!decoded) {
      throw new AuthorizationError(message);
    }

    // Check if the user has a valid session.
    const user = this.sessionService.getUserSession(decoded.sessionId);
    if (!user) {
      throw new AuthorizationError(message);
    }

    // TODO: Check if the user exists and update user variable.

    if (!user) {
      throw new AuthenticationError('User does not exist anymore!');
    }

    // Sign new access token and update session.
    const { access_token, refresh_token } = await this.sessionService.signAndSetSession(user, decoded.sessionId);

    // Send token as cookie.
    const { accessTokenCookieOptions, refreshTokenCookieOptions } = await this.sessionService.getCookieOptions();
    res.cookie('access_token', access_token, accessTokenCookieOptions);
    res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions);
    return res.json(user);
  }

  @Get('logout')
  async logout(@Req() req, @Res() res) {
    // Get the token
    let access_token;
    if (req.cookies.access_token) {
      access_token = req.cookies.access_token;
    }

    if (!access_token) {
      throw new AuthenticationError('You are not logged in!');
    }

    // Validate Access Token
    const decoded = jwt.verifyToken(access_token);

    if (!decoded) {
      throw new AuthenticationError('Token invalid or expired.');
    }

    this.sessionService.deleteUserSession(decoded.sessionId);

    res.cookie('access_token', '', { maxAge: 1 });
    res.cookie('refresh_token', '', { maxAge: 1 });

    return res.json('Logged out.');
  }
}