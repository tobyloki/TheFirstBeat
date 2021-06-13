# The First Beat
For the Summer 2021 June 11-14 Codeday event. Check out our project here: [The First Beat](https://showcase.codeday.org/project/ckpt32v4731923310qu08l1rvrg)

# Overview
-- The First Beat --
-
This project is a fun and interactive game where a player taps the button to match the beat of the spinning led. It's arcade-styled game that's also similar to games like Tap Tap Revenge or Guitar Hero. To launch the game, you simply say, "Alexa, start The First Beat". Alexa will give you a brief overview of the game and ask if you're ready to start. Once you begin, you must survive as long as you can, tapping the button the beat of the spinnning led. If you can survive long enough, you win the game. Each time you play, the speed of the ring can change, increasing or decreasing the diffuculty. It's always an exciting moment each time you play.

-- (Original Idea that had to be changed later on) --
-
This project is a fun and interactive game where a player taps the button to match the sound of the beat. It's similar to Tap Tap Revenge or Guitar Hero. To launch the game, you simply say, "Alexa, start The First Beat". Alexa will begin playing a song and then a green led will start spinning around the led ring. When the green led hits the blue led (the start position), that's when you have to tap the button in order to match the beat. You must continuously match the beat throughout the whole song in order to win. The game can be played an unlimited number of times with a different song each time you play.

-- Points --
-
You start out with a total of ten health points. If you mess up or miss a beat, then you will lose some health. If you lose all your health, then you lose the game. If you start hitting the beats on time again, then your health will gradually increase and reach full points. Your health points are displayed on an led strip (this last feature was later removed to increase the diffifculty of the game).


# How much experience do you have? Does the project use anything you didn't create?
`Jonathan:` Intermediate coding experience. This was his first time working with anything related to Amazon Alexa, Lambda, and Cloudwatch logging. It was very challenging and debugging involved was a huge headache as described in the next section. He also hadn't worked with collecting data on the beats of music files before. This was both of our first time working on a project like this.

`Alex:` Intermediate coding experience. He attempted to work with a new software called Alexa Gadgets where a Raspberry Pi, or any Bluetooth capable device could be paired with an Amazon Echo and be controlled. It's unlike typical smart home devices where devices could only be actuated. Alexa Gadgets allows for a 2-way communication so that devices can also talk back to Alexa and trigger intents in our Alexa skill. This is how we were able to make the Alexa talk to our device and vice versa.


# What challenges did you encounter?
We faced numerous challenges throughout this project. Since we tried so many new things and encountered so many obstacles, we'd say we strived for a goal that may have been too hard to reach. However, we did succesfully get our final project working in a way we liked. The project was mainly split into two parts, the cloud stuff for Jonathan, and the hardware stuff for Alex. However we did cross over into each other's terrirotires later on.

For our initial project of matching the ring led to the beat of the music, `Jonathan` worked on developing a Node.JS program that could calculate the beats of any song. It worked pretty good and could generate an array of beats with respect to time. However, we noticed that some of the beats weren't as strong as the others, and we wanted to remove some of those beats. He tried to check volume levels so that only the loadest beats would show up. However, we weren't able to find a workable solution to this problem. The next significant obstacle was getting the local code to work on AWS Lambda, the backend code for handling our Alexa skill logic. The music beat interpreter wasn't functionally properly and the reading of mp3 files was such a hassle. Debugging the problem was also difficult becuase the logs that were being sent to Cloudwatch logging were very limited and often vague. Because of this major problem, we had to modify our idea so that our project could still demonstrate all the complex technologies and integrations we'd developed in an interesting concept.

`Alex` initially worked on developing the game on the Arduino hardware. He programmed all the input and logic behind the game which worked out pretty smoothly. However the most challenging part was getting it to talk to the Raspbery Pi. The Raspberry Pi was used to talk to Alexa via Bluetooth since the Arduino didn't have a Bluetooth module onboard. The program running on the Pi was in Python. He spent a huge chunk of time trying to get the communication working via serial communication. However that didn't work, so he tried using socket.io to send the messages from Python to a Node.JS program that was succesfully able to talk to the Arduino over serial communication. However this introduced too much complexity and time, that the idea had to be scratched eventually. Lastly, Alex ended up wiring up a manualy communication system were digital wires would indicate the status of the game. After much trial and error, this worked our good.

Both of us spent a lot of time researching how to program our Alexa skill and make it communicate with the Raspberry Pi. Overall, this was a pretty tough project to overcome.