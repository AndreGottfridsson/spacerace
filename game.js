class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.titleStartTime = 0;
    }

    init(data) {
        // Ta emot musiken från StartScene
        this.music = data.music;
    }

    create() {
        this.titleStartTime = this.time.now;
        
        // Skapa stjärnbakgrund för menyn
        this.stars = {
            near: [],
            far: []
        };

        // Skapa fjärran stjärnor
        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                1,
                0xFFFFFF
            );
            this.stars.far.push(star);
        }

        // Skapa nära stjärnor
        for (let i = 0; i < 50; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                2,
                0xFFFFFF
            );
            this.stars.near.push(star);
        }

        // Lägg till titelbild - täck hela skärmen
        this.title = this.add.image(0, 0, 'title');
        this.title.setOrigin(0, 0);
        this.title.setDisplaySize(800, 600);

        // Start-knappen börjar osynlig
        this.startButton = this.add.image(400, 500, 'startbutton');
        this.startButton.setOrigin(0.5);
        this.startButton.setAlpha(0);

        // Input handlers
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.time.now - this.titleStartTime >= 5000) {
                this.scene.start('SpaceRace', { music: this.music });
            }
        });

        this.input.keyboard.on('keydown-ESC', () => {
            window.location.reload();
        });
    }

    update() {
        // Ta bort alla musikrelaterade uppdateringar från update
        // Behåll bara stjärnuppdateringar och startknapp-visning

        this.stars.far.forEach(star => {
            star.x -= 1;
            if (star.x < 0) {
                star.x = 800;
                star.y = Phaser.Math.Between(0, 600);
            }
        });

        this.stars.near.forEach(star => {
            star.x -= 2;
            if (star.x < 0) {
                star.x = 800;
                star.y = Phaser.Math.Between(0, 600);
            }
        });

        if (this.time.now - this.titleStartTime >= 5000) {
            this.startButton.setAlpha(1);
        }
    }
}

class SpaceRace extends Phaser.Scene {
    constructor() {
        super({ key: 'SpaceRace' });
        this.score = 0;
        this.acceleration = 20;
        this.deceleration = 10;
        this.maxSpeed = 300;
        this.maxRotation = 10;
        // Lägg till spawn rate variabler
        this.asteroidSpawnRate = 2000;
        this.cometSpawnRate = 10000;
    }

    preload() {
        this.load.image('ship', 'assets/spaceship.png');
        this.load.image('asteroid1', 'assets/asteroid1.png');
        this.load.image('asteroid2', 'assets/asteroid2.png');
        this.load.image('asteroid3', 'assets/asteroid3.png');
        this.load.image('asteroid4', 'assets/asteroid4.png');
        this.load.image('header', 'assets/header.png');
        this.load.audio('explosion', 'assets/game_over.mp3');
        this.load.image('comet', 'assets/comet.png');
        this.load.audio('comet_sound', 'assets/comet.mp3');
        this.load.audio('thrusters', 'assets/thrusters.mp3');
        this.load.audio('speed_up', 'assets/speed_up.mp3');
        this.load.audio('nextlevel', 'assets/nextlevel.mp3');
        this.load.image('astronaut', 'assets/astronaut.png');
        this.load.audio('astronaut', 'assets/astronaut.mp3');
        this.load.audio('astronaut_pickup', 'assets/astronaut_pickup.mp3');
        this.load.image('1000p', 'assets/1000p.png');
    }

    init(data) {
        this.music = data.music;
    }

    create() {
        // Skapa stjärnbakgrund
        this.stars = {
            near: [],
            far: []
        };

        // Skapa fjärran stjärnor (långsammare)
        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                1,
                0xFFFFFF
            );
            this.stars.far.push(star);
        }

        // Skapa nära stjärnor (snabbare)
        for (let i = 0; i < 50; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                2,
                0xFFFFFF
            );
            this.stars.near.push(star);
        }
        
        // Skapa spelaren med justerad kollisionsbox och begränsad rörelseyta
        this.player = this.physics.add.sprite(100, 300, 'ship');
        this.player.setCollideWorldBounds(true);
        // Justera världens gränser för att ta hänsyn till sidhuvudet
        this.physics.world.setBounds(0, 50, 800, 550);  // y börjar på 50, höjd är 600-50
        
        // Justera spelarens kollisionsbox
        this.player.body.setSize(this.player.width * 0.6, this.player.height * 0.6);
        this.player.body.setOffset(
            this.player.width * 0.2, 
            this.player.height * 0.2
        );
        
        // Skapa grupp för asteroider
        this.asteroids = this.physics.add.group();
        
        // Skapa grupp för kometer
        this.comets = this.physics.add.group();
        
        // Lägg till header
        this.add.image(0, 0, 'header').setOrigin(0, 0);
        
        // Uppdatera poängtext position och stil för att matcha originalet
        this.scoreText = this.add.text(650, 12, 'Score: 0', {
            fontSize: '20px',
            fill: '#fff',
            fontFamily: 'Arial'
        });

        // Lägg till level-text
        this.levelText = this.add.text(500, 12, 'Level: 1', {
            fontSize: '20px',
            fill: '#fff',
            fontFamily: 'Arial'
        });
        
        // Kontroller
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Timer för att skapa asteroider
        this.asteroidTimer = this.time.addEvent({
            delay: this.asteroidSpawnRate,
            callback: this.spawnAsteroid,
            callbackScope: this,
            loop: true
        });

        // Timer för att skapa kometer
        this.cometTimer = this.time.addEvent({
            delay: this.cometSpawnRate,
            callback: this.spawnComet,
            callbackScope: this,
            loop: true
        });

        // Level timer
        this.levelTimer = this.time.addEvent({
            delay: 30000,
            callback: this.increaseDifficulty,
            callbackScope: this,
            loop: true
        });

        // Skapa thruster-ljudet
        this.thrusterSound = this.sound.add('thrusters', { 
            loop: true,
            volume: 0.5  // Ljudvolym
        });

        // Skapa grupp för astronauter
        this.astronauts = this.physics.add.group();

        // Lägg till timer för att skapa astronauter med slumpmässigt intervall
        this.time.addEvent({
            delay: Phaser.Math.Between(20000, 30000),  // Slumpmässigt mellan 20-30 sekunder
            callback: () => {
                this.spawnAstronaut();
                // Skapa ny timer med nytt slumpmässigt intervall
                this.time.addEvent({
                    delay: Phaser.Math.Between(20000, 30000),
                    callback: this.spawnAstronaut,
                    callbackScope: this,
                    loop: true
                });
            },
            callbackScope: this
        });

        // Lägg till kollisionshantering för astronauter
        this.physics.add.overlap(this.player, this.astronauts, this.collectAstronaut, null, this);
    }

    spawnAsteroid() {
        const x = 800;
        const y = Phaser.Math.Between(100, 550);  // Ändra från 90 till 100
        const asteroidKey = `asteroid${Phaser.Math.Between(1, 4)}`;
        
        const asteroid = this.physics.add.sprite(x, y, asteroidKey);
        this.asteroids.add(asteroid);
        // Justera asteroidens kollisionsbox
        asteroid.body.setSize(asteroid.width * 0.7, asteroid.height * 0.7);
        asteroid.body.setOffset(
            asteroid.width * 0.15, 
            asteroid.height * 0.15
        );
        asteroid.setVelocityX(-200 * (1 + (parseInt(this.levelText.text.split(': ')[1]) - 1) * 0.2));
    }

    spawnComet() {
        if (this.gameOver) return;

        const comet = this.physics.add.sprite(900, Phaser.Math.Between(100, 550), 'comet');  // Ändra från 90 till 100
        this.comets.add(comet);
        // Justera kometens kollisionsbox
        comet.body.setSize(comet.width * 0.6, comet.height * 0.6);
        comet.body.setOffset(
            comet.width * 0.2, 
            comet.height * 0.2
        );
        comet.setVelocityX(-400 * (1 + (parseInt(this.levelText.text.split(': ')[1]) - 1) * 0.2));
        this.sound.play('comet_sound', { volume: 0.4 });
    }

    spawnAstronaut() {
        const astronaut = this.physics.add.sprite(900, Phaser.Math.Between(100, 550), 'astronaut');  // Ändra från 90 till 100
        this.astronauts.add(astronaut);
        astronaut.body.setSize(astronaut.width * 0.7, astronaut.height * 0.7);
        astronaut.setVelocityX(-150);
        // Spela astronaut-ljudet när den spawnar
        this.sound.play('astronaut', { volume: 0.7 });
    }

    collectAstronaut(player, astronaut) {
        astronaut.destroy();
        this.sound.play('astronaut_pickup', { volume: 0.7 });
        this.score += 1000;
        this.scoreText.setText('Score: ' + this.score);

        // Skapa poängbilden under spelaren
        const pointsImage = this.add.image(
            player.x,
            player.y + 50,
            '1000p'
        ).setOrigin(0.5);

        // Fade out animation
        this.tweens.add({
            targets: pointsImage,
            alpha: 0,
            duration: 2000,
            ease: 'Power1',
            onComplete: () => {
                pointsImage.destroy();
            }
        });
    }

    update() {
        // Uppdatera stjärnpositioner
        this.stars.far.forEach(star => {
            star.x -= 1; // Långsammare stjärnor
            if (star.x < 0) {
                star.x = 800;
                star.y = Phaser.Math.Between(0, 600);
            }
        });

        this.stars.near.forEach(star => {
            star.x -= 2; // Snabbare stjärnor
            if (star.x < 0) {
                star.x = 800;
                star.y = Phaser.Math.Between(0, 600);
            }
        });

        if (!this.player || !this.player.body) return;

        // Uppdatera thruster-ljudet baserat på rörelse
        if (this.cursors.up.isDown || this.cursors.down.isDown || 
            this.cursors.left.isDown || this.cursors.right.isDown) {
            if (!this.thrusterSound.isPlaying) {
                this.thrusterSound.play();
            }
        } else {
            this.thrusterSound.stop();
        }

        // Vertikal rörelse med acceleration och rotation
        if (this.cursors.up.isDown) {
            this.player.body.velocity.y -= this.acceleration;
            // Rotera gradvis uppåt (negativt för moturs rotation)
            this.player.angle = Phaser.Math.Linear(this.player.angle, -this.maxRotation, 0.1);
        } else if (this.cursors.down.isDown) {
            this.player.body.velocity.y += this.acceleration;
            // Rotera gradvis nedåt (positivt för medurs rotation)
            this.player.angle = Phaser.Math.Linear(this.player.angle, this.maxRotation, 0.1);
        } else {
            // Återgå gradvis till normal rotation
            this.player.angle = Phaser.Math.Linear(this.player.angle, 0, 0.1);
            
            // Bromsa gradvis
            if (this.player.body.velocity.y > 0) {
                this.player.body.velocity.y = Math.max(0, this.player.body.velocity.y - this.deceleration);
            } else if (this.player.body.velocity.y < 0) {
                this.player.body.velocity.y = Math.min(0, this.player.body.velocity.y + this.deceleration);
            }
        }

        // Horisontell rörelse med acceleration
        if (this.cursors.left.isDown) {
            this.player.body.velocity.x -= this.acceleration;
        } else if (this.cursors.right.isDown) {
            this.player.body.velocity.x += this.acceleration;
        } else {
            // Bromsa gradvis
            if (this.player.body.velocity.x > 0) {
                this.player.body.velocity.x = Math.max(0, this.player.body.velocity.x - this.deceleration);
            } else if (this.player.body.velocity.x < 0) {
                this.player.body.velocity.x = Math.min(0, this.player.body.velocity.x + this.deceleration);
            }
        }

        // Begränsa maxhastigheten
        this.player.body.velocity.x = Phaser.Math.Clamp(this.player.body.velocity.x, -this.maxSpeed, this.maxSpeed);
        this.player.body.velocity.y = Phaser.Math.Clamp(this.player.body.velocity.y, -this.maxSpeed, this.maxSpeed);

        // Kontrollera kollisioner
        this.physics.overlap(this.player, this.asteroids, this.hitAsteroid, null, this);
        this.physics.overlap(this.player, this.comets, this.hitComet, null, this);
        
        // Uppdatera poäng för asteroider som passerat
        this.asteroids.getChildren().forEach(asteroid => {
            if (asteroid.x < -50) {
                this.score += 10;
                this.scoreText.setText('Score: ' + this.score);
                asteroid.destroy();
            }
        });

        // Uppdatera och rensa kometer
        this.comets.getChildren().forEach(comet => {
            if (comet.x < -50) {
                this.score += 30; // Mer poäng för att undvika kometer
                this.scoreText.setText('Score: ' + this.score);
                comet.destroy();
            }
        });
    }

    hitAsteroid() {
        this.thrusterSound.stop();
        this.sound.play('explosion', { volume: 0.6 });
        this.scene.start('HighscoreScene', { 
            score: this.score,
            music: this.music
        });
    }

    hitComet(player, comet) {
        this.thrusterSound.stop();
        this.sound.play('explosion');
        this.scene.start('HighscoreScene', { 
            score: this.score,
            music: this.music
        });
    }

    // Uppdatera level när svårighetsgraden ökar
    increaseDifficulty() {
        const currentLevel = parseInt(this.levelText.text.split(': ')[1]);
        const newLevel = currentLevel + 1;
        
        // Uppdatera level-text
        this.levelText.setText(`Level: ${newLevel}`);
        
        // Spela nextlevel ljudet
        this.sound.play('nextlevel', { volume: 0.5 });
        
        // Ge poängbonus baserat på level
        const bonus = Math.pow(2, newLevel - 2) * 100;
        this.score += bonus;
        this.scoreText.setText('Score: ' + this.score);
        
        // Öka hastigheten på existerande objekt
        this.asteroids.getChildren().forEach(asteroid => {
            asteroid.setVelocityX(asteroid.body.velocity.x * 1.2);
        });
        
        this.comets.getChildren().forEach(comet => {
            comet.setVelocityX(comet.body.velocity.x * 1.2);
        });

        // Uppdatera spawn rates
        this.asteroidSpawnRate = Math.max(2000 - (newLevel * 200), 500);
        this.cometSpawnRate = Math.max(10000 - (newLevel * 500), 3000);

        // Uppdatera existerande timers
        this.asteroidTimer.reset({
            delay: this.asteroidSpawnRate,
            callback: this.spawnAsteroid,
            callbackScope: this,
            loop: true
        });

        this.cometTimer.reset({
            delay: this.cometSpawnRate,
            callback: this.spawnComet,
            callbackScope: this,
            loop: true
        });
    }
}

class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    preload() {
        // Ladda alla bilder och ljud som behövs för hela spelet
        this.load.image('title', 'assets/title.png');
        this.load.image('startbutton', 'assets/startbutton.png');
        this.load.audio('background_music', 'assets/background_music.mp3');
    }

    create() {
        // Enkel svart bakgrund med text på två rader
        this.add.text(400, 300, 'Ett litet spel gjort med hjälp av\nChatGPT, Cursor och Claude.\nKlicka för att testa.', {
            fontSize: '24px',
            fill: '#fff',
            align: 'center'  // Centrera texten
        }).setOrigin(0.5);

        // När användaren klickar
        this.input.on('pointerdown', () => {
            this.music = this.sound.add('background_music', { 
                loop: true,
                volume: 0.4  // Justera bakgrundsmusiken
            });
            this.music.play();
            this.scene.start('MenuScene', { music: this.music });
        });
    }
}

class HighscoreScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HighscoreScene' });
    }

    preload() {
        this.load.image('score', 'assets/score.png');
    }

    init(data) {
        this.finalScore = data.score;
        this.music = data.music;
        this.highscore = localStorage.getItem('highscore') || 0;
        if (this.finalScore > this.highscore) {
            this.highscore = this.finalScore;
            localStorage.setItem('highscore', this.highscore);
        }
    }

    create() {
        // Skapa stjärnbakgrund som i andra scener
        this.stars = {
            near: [],
            far: []
        };

        // Skapa fjärran stjärnor
        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                1,
                0xFFFFFF
            );
            this.stars.far.push(star);
        }

        // Skapa nära stjärnor
        for (let i = 0; i < 50; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                2,
                0xFFFFFF
            );
            this.stars.near.push(star);
        }

        // Lägg till score.png som bakgrund
        this.add.image(400, 300, 'score').setOrigin(0.5);

        // GAME OVER högst upp - fetstilad och med skugga
        this.add.text(400, 100, 'GAME OVER', {
            fontSize: '48px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#fff',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 2,
                fill: true
            }
        }).setOrigin(0.5);

        // YOUR SCORE - fetstilad och med skugga
        this.add.text(400, 160, 'YOUR SCORE', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#fff',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 2,
                fill: true
            }
        }).setOrigin(0.5);

        // Poäng med skugga
        this.add.text(400, 190, this.finalScore, {
            fontSize: '32px',
            fontFamily: 'Arial',
            fill: '#fff',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 2,
                fill: true
            }
        }).setOrigin(0.5);

        // HIGH SCORES - fetstilad och med skugga
        this.add.text(400, 250, 'HIGH SCORES', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#fff',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 2,
                fill: true
            }
        }).setOrigin(0.5);

        // Hämta och visa top 5 highscores
        let highscores = JSON.parse(localStorage.getItem('highscores') || '[]');
        highscores.push(this.finalScore);
        highscores.sort((a, b) => b - a);
        highscores = highscores.slice(0, 5);  // Behåll bara top 5
        localStorage.setItem('highscores', JSON.stringify(highscores));

        // Visa top 5 lista med vänsterjusterad text och skugga
        highscores.forEach((score, index) => {
            this.add.text(350, 290 + (index * 30), `${index + 1}. ${score}`, {
                fontSize: '24px',
                fontFamily: 'Arial',
                fill: '#fff',
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000',
                    blur: 2,
                    fill: true
                }
            }).setOrigin(0, 0.5);  // Vänsterjustera texten
        });

        // Continue-text med skugga
        this.add.text(400, 500, 'PRESS SPACE TO CONTINUE', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#fff',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 2,
                fill: true
            }
        }).setOrigin(0.5);

        // Space-tangenten som förut
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('MenuScene', { music: this.music });
        });
    }

    update() {
        // Uppdatera stjärnorna som i andra scener
        this.stars.far.forEach(star => {
            star.x -= 1;
            if (star.x < 0) {
                star.x = 800;
                star.y = Phaser.Math.Between(0, 600);
            }
        });

        this.stars.near.forEach(star => {
            star.x -= 2;
            if (star.x < 0) {
                star.x = 800;
                star.y = Phaser.Math.Between(0, 600);
            }
        });
    }
}

// Konfigurera spelet
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [StartScene, MenuScene, SpaceRace, HighscoreScene]  // Lägg till MenuScene först
};

// Starta spelet
window.onload = () => {
    const game = new Phaser.Game(config);
}; 
