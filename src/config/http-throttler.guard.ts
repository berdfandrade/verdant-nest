import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/*
	ThrottlerGuard aplicado só a HTTP.
	Os eventos do WebSocket têm limite próprio (ChatService.allowMessage),
	porque o throttler depende de request/response HTTP.
*/
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (context.getType() !== 'http') return true;
		return super.canActivate(context);
	}
}
