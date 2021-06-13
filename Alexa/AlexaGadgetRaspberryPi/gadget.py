import json
import logging
import sys
import threading
import time

from agt import AlexaGadget
from gpiozero import LED, Button

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger(__name__)

start = LED(16)
gameOver = Button(14)

class ColorCyclerGadget(AlexaGadget):
    def __init__(self):
        super().__init__()

        start.off()
        gameOver.when_pressed = self._button_pressed

        self.game_active = False

    def _button_pressed(self):
        """
        Callback to report the LED color to the skill when the button is pressed
        """
        if self.game_active:
            start.off()
            logger.info('Game Over')

            # Send custom event to skill to notify of game over
            payload = {'empty': 'no value'}
            self.send_custom_event(
                'Custom.ColorCyclerGadget', 'ReportColor', payload)

    def on_custom_colorcyclergadget_blinkled(self, directive):
        payload = json.loads(directive.payload.decode("utf-8"))

        self.game_active = bool(payload['startGame'])
        print("game_active:", self.game_active)

        if self.game_active:
            start.on()

    def on_custom_colorcyclergadget_stopled(self, directive):
        start.off()
        self.game_active = False

        print("game_active:", self.game_active)
        
if __name__ == '__main__':
    print("Starting program")
    ColorCyclerGadget().main()
