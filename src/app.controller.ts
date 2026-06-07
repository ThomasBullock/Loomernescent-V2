import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('add')
  @Render('add')
  add() {
    return {};
  }
}
