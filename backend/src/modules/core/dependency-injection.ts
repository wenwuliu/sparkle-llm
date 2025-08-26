/**
 * 依赖注入容器
 * 管理服务的创建、注册和依赖解析
 */

type ServiceFactory<T = any> = () => T | Promise<T>;
type ServiceInstance<T = any> = T;

interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: ServiceInstance<T>;
  dependencies?: string[];
}

/**
 * 依赖注入容器类
 */
export class DIContainer {
  private services = new Map<string, ServiceDefinition>();
  private resolving = new Set<string>();

  /**
   * 注册单例服务
   */
  registerSingleton<T>(name: string, factory: ServiceFactory<T>, dependencies: string[] = []): void {
    this.services.set(name, {
      factory,
      singleton: true,
      dependencies
    });
  }

  /**
   * 注册瞬态服务
   */
  registerTransient<T>(name: string, factory: ServiceFactory<T>, dependencies: string[] = []): void {
    this.services.set(name, {
      factory,
      singleton: false,
      dependencies
    });
  }

  /**
   * 注册实例
   */
  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, {
      factory: () => instance,
      singleton: true,
      instance
    });
  }

  /**
   * 解析服务
   */
  async resolve<T>(name: string): Promise<T> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    // 检查循环依赖
    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected for service '${name}'`);
    }

    // 如果是单例且已实例化，直接返回
    if (service.singleton && service.instance) {
      return service.instance;
    }

    this.resolving.add(name);

    try {
      // 解析依赖
      const dependencies: any[] = [];
      if (service.dependencies) {
        for (const dep of service.dependencies) {
          dependencies.push(await this.resolve(dep));
        }
      }

      // 创建实例
      const instance = await service.factory();

      // 如果是单例，缓存实例
      if (service.singleton) {
        service.instance = instance;
      }

      return instance;
    } finally {
      this.resolving.delete(name);
    }
  }

  /**
   * 检查服务是否已注册
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * 获取所有已注册的服务名称
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 清理容器
   */
  clear(): void {
    this.services.clear();
    this.resolving.clear();
  }
}

// 创建全局容器实例
export const container = new DIContainer();
