import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { User } from '@/user/user.schema';
import { StorageService } from '@/storage/storage.service';
import { detectImageType } from '@/storage/image-type';
import MongoDbUtils from '@/utils/MongoDB.utils';

export const MAX_PHOTOS = 6;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class PhotosService {
	constructor(
		@InjectModel(User.name) private readonly userModel: Model<User>,
		private readonly storage: StorageService,
	) {}

	async upload(userId: Types.ObjectId | string, file?: Express.Multer.File) {
		if (!file?.buffer?.length) throw new BadRequestException('Send an image in the "photo" field');

		// O tipo vem do conteúdo do arquivo, não do que o cliente declarou
		const type = detectImageType(file.buffer);
		if (!type) throw new BadRequestException('Only JPEG, PNG or WEBP images are allowed');

		const user = await this.userModel.findById(userId).select('photos');
		if (!user) throw new NotFoundException('User does not exist');
		if (user.photos.length >= MAX_PHOTOS) throw new BadRequestException(`You can have up to ${MAX_PHOTOS} photos`);

		const stored = await this.storage.upload({
			key: `users/${user.id}/${randomUUID()}.${type.ext}`,
			body: file.buffer,
			contentType: type.mime,
		});

		// Só adiciona se ainda houver espaço (protege contra uploads simultâneos)
		const updated = await this.userModel.findOneAndUpdate(
			{ _id: user._id, [`photos.${MAX_PHOTOS - 1}`]: { $exists: false } },
			{ $push: { photos: { url: stored.url, key: stored.key, uploadDate: new Date() } } },
			{ new: true },
		);

		if (!updated) {
			await this.storage.delete(stored.key);
			throw new BadRequestException(`You can have up to ${MAX_PHOTOS} photos`);
		}

		return updated.photos;
	}

	async remove(userId: Types.ObjectId | string, photoId: string) {
		const id = MongoDbUtils.toObjectId(photoId);
		const user = await this.userModel.findOne({ _id: userId, 'photos._id': id }).select('photos');
		if (!user) throw new NotFoundException('Photo not found');

		const photo = user.photos.find(p => MongoDbUtils.sameId(p._id, id));

		const updated = await this.userModel.findByIdAndUpdate(
			user._id,
			{ $pull: { photos: { _id: id } } },
			{ new: true },
		);

		// Remove o arquivo depois de tirar do perfil (links externos não têm `key`)
		if (photo?.key) await this.storage.delete(photo.key);

		return updated!.photos;
	}

	// Move a foto para a primeira posição (foto principal)
	async setMain(userId: Types.ObjectId | string, photoId: string) {
		const id = MongoDbUtils.toObjectId(photoId);
		const user = await this.userModel.findOne({ _id: userId, 'photos._id': id });
		if (!user) throw new NotFoundException('Photo not found');

		const index = user.photos.findIndex(p => MongoDbUtils.sameId(p._id, id));
		const [photo] = user.photos.splice(index, 1);
		user.photos.unshift(photo);
		await user.save();

		return user.photos;
	}
}
