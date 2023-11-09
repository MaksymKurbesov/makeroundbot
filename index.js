const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const TelegramBot = require('node-telegram-bot-api');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const axios = require('axios');
const TOKEN = '6795077836:AAHbCE7ZkXqY8ib2f_ppJaaL5lvs53wYTh4';
const bot = new TelegramBot(TOKEN, {polling: true});


ffmpeg.setFfmpegPath(ffmpegPath);

bot.on('message', async (msg) => {
	if (msg.video) {
		const videoFileId = msg.video.file_id;
		const videoStream = await bot.getFileStream(videoFileId);
		const tempPath = path.join(__dirname, 'temp_video.mp4');

		// Сохраняем видео во временный файл
		videoStream.pipe(fs.createWriteStream(tempPath)).on('close', async () => {
			const outputPath = path.join(__dirname, 'output.mp4');

			// Обрабатываем видео
			applyCircleMask(tempPath, outputPath, msg.chat.id)
				.then(() => {
					// Отправляем видео после обработки
					bot.sendVideoNote(msg.chat.id, fs.createReadStream(outputPath));
				})
				.catch(err => {
					console.error('Ошибка при обработке видео:', err);
				});
		});
	}
});

function applyCircleMask(inputPath, outputPath, chatId) {
	return new Promise((resolve, reject) => {
		ffmpeg(inputPath)
			.videoFilters([
				{
					filter: 'crop',
					options: {
						w: 'min(iw,ih)',
						h: 'min(iw,ih)',
						x: '(iw-min(iw,ih))/2',
						y: '(ih-min(iw,ih))/2',
					},
				},
			])
			.size(`512x512`)
			.autopad()
			.toFormat('mp4')
			.on('start', async () => {
				await bot.sendMessage(chatId, `Обработка видео начата 🟢`)
			})
			.on('progress', async (progress) => {
				await bot.sendMessage(chatId, `${Math.round(progress.percent)}%`)
			})
			.on('end', resolve)
			.on('error', reject)
			.save(outputPath);
	});
}