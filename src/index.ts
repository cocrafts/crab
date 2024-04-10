import { Kernel } from 'core/kernel';

const enum PortKey {
	FromApp,
	FromSDK,
	FromPopup,
}

const enum EventKey {
	Ping,
	Pong,
}

export const kernel = new Kernel<PortKey, EventKey>();

kernel.registerPort(PortKey.FromApp, {} as never);

kernel
	.port(PortKey.FromApp)
	.handle(EventKey.Pong)
	.use(() => console.log('first middleware'))
	.use(() => console.log('second middleware'))
	.use(() => console.log('third middleware'))

	.registerPort(PortKey.FromSDK, {} as never)
	.handle(EventKey.Ping)
	.use(() => console.log('first middleware'))
	.use(() => console.log('second middleware'))
	.use(() => console.log('third middleware'))

	.registerPort(PortKey.FromPopup, {} as never)
	.handle(EventKey.Ping)
	.use(() => console.log('first middleware'))
	.use(() => console.log('second middleware'))
	.use(() => console.log('third middleware'));
