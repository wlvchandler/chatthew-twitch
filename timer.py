import asyncio

class Timer:
    def __init__(self, timeout, callback):
        self._timeout = timeout
        self._callback =  callback
        self._task = asyncio.ensure_future(self._job())

    async def _job(self):
        await asyncio.sleep(self._timeout)
        await self._callback()

    def cancel(self):
        self._task.cancel()


async def timeout_callback():
    await asyncio.sleep(0.1)
    print('echo!')

    
async def run_timer():
    print("\nFirst example:")
    timer = Timer(2, timeout_callback)
    await asyncio.sleep(2.5)

    print("\nSecond example:")
    timer = Timer(2, timeout_callback)
    await asyncio.sleep(1)
    timer.cancel()
    await asyncio.sleep(1.5)
    

loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

try:
    loop.run_until_complete(run_timer())
finally:
    loop.run_until_complete(loop.shutdown_asyncgens())
    loop.close()

