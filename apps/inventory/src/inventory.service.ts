import { RMQ_ORDERS } from '@app/common/constants';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CategoriesRepository, ProductsRepository } from './repositories';
import {
  CreateCategoryDTO,
  CreateProductDTO,
  DeleteCategoryRequest,
  DeleteProductRequest,
  ReadCategoryDTO,
  ReadCategoryNoProductsDTO,
  ReadCategoryRequest,
  ReadProductDTO,
  UpdateCategoryDTO,
  UpdateProductDTO,
  UserSession,
} from '@app/common/dto';
import { ProductEntity } from './entities/product.entity';
import { CategoryEntity } from './entities/category.entity';
import { AuthorizationError, ConflictError } from '@app/common/errors';

@Injectable()
export class InventoryService {
  constructor(
    private readonly productRepo: ProductsRepository,
    private readonly categoryRepo: CategoriesRepository,
    @Inject(RMQ_ORDERS) private rmqOrders: ClientProxy,
    @InjectMapper() private readonly mapper: Mapper,
  ) {}

  async createCategory(req: CreateCategoryDTO, chef: UserSession): Promise<ReadCategoryDTO> {
    if (await this.categoryRepo.exists({ name: req.name })) {
      throw new ConflictError(`Category with name '${req.name}' already exists.`);
    }
    let category = this.mapper.map(req, CreateCategoryDTO, CategoryEntity);
    category.chefId = chef.id;
    category = await this.categoryRepo.save(category);
    return this.mapper.map(category, CategoryEntity, ReadCategoryDTO);
  }

  async readCategoriesByChefId(req: ReadCategoryRequest): Promise<ReadCategoryDTO[] | ReadCategoryNoProductsDTO[]> {
    const categories = await this.categoryRepo.findAllBy({ chefId: req.chefId });
    if (req.withProducts) {
      return this.mapper.mapArray(categories, CategoryEntity, ReadCategoryDTO);
    } else {
      return this.mapper.mapArray(categories, CategoryEntity, ReadCategoryNoProductsDTO);
    }
  }

  async updateCategory(req: UpdateCategoryDTO, chef: UserSession): Promise<ReadCategoryNoProductsDTO> {
    let category = await this.categoryRepo.findOneById(req.id);
    if (!category) {
      throw new ConflictError(`Trying to update a category that does not exist.`);
    }
    if (category.chefId !== chef.id) {
      throw new AuthorizationError('Trying to update a category that does not belong to you.');
    }
    category.name = req.name;
    category.description = req.description;
    category = await this.categoryRepo.save(category);
    return this.mapper.map(category, CategoryEntity, ReadCategoryNoProductsDTO);
  }

  async deleteCategory(req: DeleteCategoryRequest, chef: UserSession): Promise<void> {
    const category = await this.categoryRepo.findOneById(req.id);
    if (!category) {
      throw new ConflictError(`Trying to delete a category that does not exist.`);
    }
    if (category.chefId !== chef.id) {
      throw new AuthorizationError('Trying to delete a category that does not belong to you.');
    }
    await this.categoryRepo.remove(category);
    // TODO: Delete all products with category.
  }

  /* ------------------------------------------------------------------------------------------------------------------ */

  async createProduct(req: CreateProductDTO, chef: UserSession): Promise<ReadProductDTO> {
    if (await this.productRepo.exists({ name: req.name })) {
      throw new ConflictError(`Product with name '${req.name}' already exists.`);
    }
    const category = await this.categoryRepo.findOneById(req.categoryId);
    if (!category) {
      throw new ConflictError(`Trying to create a product with non-existent category.`);
    }
    if (category.chefId !== chef.id) {
      throw new AuthorizationError('Trying to create a product with a category that does not belong to you.');
    }
    let product = this.mapper.map(req, CreateProductDTO, ProductEntity);
    product.chefId = chef.id;
    product.category = category;
    product = await this.productRepo.save(product);
    return this.mapper.map(product, ProductEntity, ReadProductDTO);
  }

  async updateProduct(req: UpdateProductDTO, chef: UserSession): Promise<ReadProductDTO> {
    let product = await this.productRepo.findOneById(req.id);
    if (!product) {
      throw new ConflictError(`Trying to update a product that does not exist.`);
    }
    if (product.chefId !== chef.id) {
      throw new AuthorizationError('Trying to update a product that does not belong to you.');
    }
    const category = await this.categoryRepo.findOneById(req.categoryId);
    if (!category) {
      throw new ConflictError(`Trying to update a product with non-existent category.`);
    }
    if (category.chefId !== chef.id) {
      throw new AuthorizationError('Trying to update a product with a category that does not belong to you.');
    }
    product.name = req.name;
    product.description = req.description;
    product.quantity = req.quantity;
    product.category = category;
    product = await this.productRepo.save(product);
    return this.mapper.map(product, ProductEntity, ReadProductDTO);
  }

  async deleteProduct(req: DeleteProductRequest, chef: UserSession): Promise<void> {
    const product = await this.productRepo.findOneById(req.id);
    if (!product) {
      throw new ConflictError(`Trying to delete a category that does not exist.`);
    }
    if (product.chefId !== chef.id) {
      throw new AuthorizationError('Trying to delete a product that does not belong to you.');
    }
    await this.productRepo.remove(product);
  }
}
