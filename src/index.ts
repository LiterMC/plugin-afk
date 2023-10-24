
console.log(`plugin ${$.ID}@${$.VERSION} is loading`)

const timers = new Map()

$.on('serve', (event: ServeEvent) => {
	const { player, client, server } = event
	if(!player){ // if it's a ping
		return
	}

	var timerId: Object | null = null

	event.cancel() // the cancel here means plugin will handle connection packets

	console.debug('player %s trying to connect', player.name)

	var lastXYZ: { x: number, y: number, z: number } | null = null

	client.on('close', (event: CloseEvent) => {
		console.log('client conn closed')
		if(timerId){
			clearInterval(timerId)
			timers.delete(timerId)
			timerId = null
		}
	})
	server.on('close', (event: CloseEvent) => {
		console.log('server conn closed')
		if(timerId){
			clearInterval(timerId)
			timers.delete(timerId)
			timerId = null
		}
	})

	client.on('packet', (event: PacketEvent) => {
		const { packet } = event
		// command structure see https://wiki.vg/Protocol#Chat_Command
		switch(packet.id){
		case 0x03: {// Chat Message ID for 1.18.2
			const chat = packet.string()
			if(chat.startsWith('/')){
				const command = chat.substring(1)
				const fields = command.split(/\s+/)
				if(fields[0] === 'afk'){
					event.cancel() // catch the command here
					if(timerId){
						console.debug('clear timer')
						clearInterval(timerId)
						timers.delete(timerId)
						timerId = null
					}else{
						console.debug('start timer')
						timerId = setInterval(() => {
							if(!lastXYZ){
								return
							}
							console.debug('jumping...')
							server
								.newPacket(0x11 /* Player Position ID */)
								.double(lastXYZ.x)
								.double(lastXYZ.y + 1)
								.double(lastXYZ.z)
								.bool(true) // on ground
								.send()
							client
								.newPacket(0x38)
								.double(0)
								.double(1)
								.double(0)
								.float(0)
								.float(0)
								.byte(0b11111)
								.varInt(0)
								.bool(false)
								.send()
						}, 500)
						console.log('timerId:', timerId)
						timers.set(timerId, null)
						server.on('attacked', (event) => {
							server.close()
						})
					}
				}
			}
			break
		}
		case 0x11:{
			// console.log('player position:', packet.data)
			break
		}
		}
	})
	server.on('packet', (event: PacketEvent) => {
		const { packet } = event
		switch(packet.id){
		case 0x38: {
			const x = packet.double()
			const y = packet.double()
			const z = packet.double()
			const yaw = packet.float()
			const pitch = packet.float()
			const flags = packet.byte()
			const teleId = packet.varInt()
			const dismount = packet.bool()
			console.log(`flags=${flags.toString(2)}; xyz=${x} ${y} ${z}; yaw=${yaw}; pitch=${pitch}; teleId=${teleId}; dismount=${dismount}`)
			lastXYZ = {
				x: x,
				y: y,
				z: z,
			}
			break
		}
		}
	})
})

$.on('unload', () => {
	console.log('plugin %q is unloading', $.ID)
	for(let id of timers.keys()){
		clearInterval(id)
	}
	timers.clear()
})
