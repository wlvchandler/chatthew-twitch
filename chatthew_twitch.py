import os
import random
import requests
import bank
import json
from twitchio.ext import commands

import signal
import sys

BASE_URL='https://api.twitch.tv/helix/'


def signal_handler(sig, frame):
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class Bot(commands.Bot):

    def __init__(self):
        super().__init__(token=os.environ['TOKEN'], prefix='!', initial_channels=['#jaahska', '#swifcheese'])
        self.viewer_list = None
        with open('viewers.json') as f:
            self.viewer_list = json.load(f)

    def write_viewers(self):
        with open('viewers.json', 'w', encoding='utf-8') as f:
            print(self.viewer_list)
            json.dump(self.viewer_list, f, ensure_ascii=False, indent=4)

    def readHitCount(self):
        try:
            with open('data/hitcount', 'r') as f:
                self.hitcount = int(f.read())
        except:
            self.hitcount = 0

    def writeHitCount(self):
        try:
            with open('data/hitcount', 'w') as f:
                f.write(str(self.hitcount))
        except Exception as e:
            print(e)

    async def event_ready(self):
        print(f'Logged in as | {self.nick}')
        self.hitcount = 0
        self.writeHitCount()

        for channel in self.connected_channels: # test channel hello
            await channel.send('alright alright alright')

    async def event_message(self, ctx):
        if ctx.echo:
            return
        if ctx.author.name not in self.viewer_list.keys():
            #self.viewer_setup(ctx.author.name)
            self.viewer_list[ctx.author.name] = {}
            self.viewer_list[ctx.author.name]['n_messages'] = 0
        self.viewer_list[ctx.author.name]['n_messages'] += 1

        if ctx.content.lower() in ['chatthew', 'the_chatthew', 'the chatthew']:
            await ctx.channel.send('what')
            #print(ctx.content)

        self.write_viewers()  # we can't be writing the file every message, but for now it's ok
        await self.handle_commands(ctx)


    @commands.command()
    async def activity(self, ctx: commands.Context):
        name = ctx.author.name
        n_messages = self.viewer_list[name]["n_messages"]
        await ctx.send(f'{name} has sent {n_messages} messages')

    @commands.command()
    async def lurk(self, ctx: commands.Context):
        lurk_special = {
            'victorreign' : 'Reign is hiding in his own asshole',
            'moscow_mueller' : 'ладно, иди бля на хуй',
            'dadydennis' : 'bye dennis my heart is always with you, you special stormtrooper',
            'postindustrialcitizen' : 'guess post is off to eat another metric fuck ton of lasagna',
            'camyo11' : 'go draw a fucking cartoon, dweeb. JK',
            'emilybloomshow' : 'no pleeeeaaassse don\'t go ;-; i can change i can be whatever you want me to be, you are also good at 3D puzzles',
            'commander_lima' : 'Lima is going back to his side of the border wall',
            'villatx': 'carlos is off to chop off his own balls',
        }
        lurk_dflt = [f'lol dont care bye {ctx.author.name}', f'and STAY OUT, {ctx.author.name} >:(', f'thanks {ctx.author.name}, very cool!']
        username = ctx.author.name
        print(ctx.author.name)
        lurk_resp = random.choice(lurk_dflt)
        if username in lurk_special.keys():
            lurk_resp = lurk_special[username]
        await ctx.send(lurk_resp)

    @commands.command()
    async def bank(self, ctx: commands.Context):
        b = bank.Bank()
        await ctx.send(b.get_balance(ctx.author.name))

    @commands.command()
    async def so(self, ctx: commands.Context):
        username = ctx.message.content.split()[1]
        if username[0] == '@':
            username = username[1:]
        headers = {'Authorization': 'Bearer ' + os.environ['TOKEN'].split(':')[-1], 'Client-ID': os.environ['CLIENT_ID']}
        user_id = requests.get(BASE_URL+'users?login='+username, headers=headers).json()['data'][0]['id']
        if user_id == '':
            return
        last_game = requests.get(BASE_URL+'channels?broadcaster_id='+user_id, headers=headers).json()['data'][0]['game_name']
        last_streaming=f'They were last streaming {last_game}.'
        if last_game == '':
            last_streaming = ''
        await ctx.send(f'Go follow https://twitch.tv/{username.lower()}. {last_streaming}')

    @commands.command()
    async def chatthew(self, ctx: commands.Context):
        await ctx.send("what")

    @commands.command()
    async def dennis(self, ctx: commands.Context):
        await ctx.send("love the pickles monste385Pickle")

    @commands.command()
    async def reignfriend(self, ctx: commands.Context):
        await ctx.send("Reign is a good friend. He will cum for you")

    @commands.command()
    async def hit(self, ctx: commands.Context):
        self.readHitCount()
        self.hitcount += 1
        self.writeHitCount()
        plural = '' if self.hitcount == 1 else 's'
        await ctx.send(f'This idiot has been hit {self.hitcount} time{plural} today')

    @commands.command()
    async def ieatass(self, ctx: commands.Context):
        await ctx.send('fuckin S A M E fam')

bot = Bot()
bot.run()
