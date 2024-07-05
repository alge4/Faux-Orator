# bot.py
import discord
from discord.ext import commands
from azure.cognitiveservices.speech import SpeechConfig, SpeechRecognizer, AudioConfig
import threading
from config import Config
import os

intents = discord.Intents.default()
intents.messages = True
intents.guilds = True
intents.voice_states = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

speech_key = Config.AZURE_SPEECH_KEY
service_region = Config.AZURE_SERVICE_REGION

@bot.event
async def on_ready():
    print(f'Bot connected as {bot.user}')

@bot.command()
async def join(ctx):
    if ctx.author.voice:
        channel = ctx.author.voice.channel
        vc = await channel.connect()
        threading.Thread(target=speech_recognition).start()
        await ctx.send(f'Joined {channel}')
    else:
        await ctx.send("You need to be in a voice channel for me to join.")

@bot.command()
async def leave(ctx):
    if ctx.voice_client:
        await ctx.guild.voice_client.disconnect()
        await ctx.send("Disconnected from the voice channel.")
    else:
        await ctx.send("I'm not in a voice channel.")

@bot.event
async def on_voice_state_update(member, before, after):
    if after.channel is not None and after.channel.guild.voice_client is None:
        vc = await after.channel.connect()
        vc.listen(discord.opus.Decoder(lambda data: handle_voice(data, member)))

def handle_voice(data, member):
    speech_config = SpeechConfig(subscription=speech_key, region=service_region)
    audio_config = AudioConfig(stream=data)
    recognizer = SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

    def result_callback(event):
        print(f'{member.name}: {event.result.text}')
        # Here, you would log the text to your database and display in your chat window

    recognizer.recognized.connect(result_callback)
    recognizer.start_continuous_recognition()

def run_discord_bot():
    bot.run(Config.DISCORD_TOKEN)
