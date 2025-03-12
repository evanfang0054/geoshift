/**
 * @file 地理坐标转换工具
 * @description 
 * 提供高性能、高精度的坐标系统转换功能，支持：
 * - WGS84(GPS全球卫星定位系统)
 * - GCJ02(国测局火星坐标系)
 * - BD09(百度坐标系)
 * 
 * 特性：
 * - 高性能：采用函数式编程范式，优化计算性能
 * - 高精度：使用迭代逼近算法，确保转换精度
 * - 类型安全：完整的 TypeScript 类型定义
 * - 多格式支持：兼容多种坐标输入/输出格式
 */

/**
 * 标准坐标点接口
 * @interface Coordinate
 * @property {number} longitude - 经度，范围：[-180, 180]
 * @property {number} latitude - 纬度，范围：[-90, 90]
 */
type Coordinate = {
  longitude: number;
  latitude: number;
};

/**
 * 坐标系统枚举
 * @enum {string}
 */
enum CoordSystem {
  /** 全球卫星定位系统坐标，国际标准 */
  WGS84 = 'WGS84',
  /** 国测局02坐标系，中国国家标准，在WGS84基础上加密 */
  GCJ02 = 'GCJ02',
  /** 百度坐标系，在GCJ02基础上进行进一步偏移 */
  BD09 = 'BD09'
}

/**
 * 坐标点元组类型 [经度, 纬度]
 * @typedef {[number, number]} Point
 */
export type Point = [number, number];

/**
 * 通用经纬度对象类型
 * @interface LatLng
 * @property {number} lat - 纬度
 * @property {number} lng - 经度
 */
export type LatLng = { lat: number; lng: number };

/**
 * 边界框类型定义
 * @interface BoundingBox
 * @property {number} minLat - 最小纬度
 * @property {number} maxLat - 最大纬度
 * @property {number} minLng - 最小经度
 * @property {number} maxLng - 最大经度
 */
export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/**
 * 坐标转换器配置常量
 * @constant
 */
const CONFIG = {
  // 椭球体参数
  ELLIPSOID: {
    A: 6378245.0,  // 长半轴
    EE: 0.00669342162296594323  // 偏心率平方
  },
  
  // 坐标系转换参数
  TRANSFORM: {
    X_PI: Math.PI * 3000.0 / 180.0,
    PI: Math.PI,
    CHINA_BOUNDS: {
      LAT: { MIN: 0.8293, MAX: 55.8271 },
      LNG: { MIN: 72.004, MAX: 137.8347 }
    }
  },
  
  // 精度控制
  PRECISION: {
    COORDINATE: 8,  // 坐标精度
    THRESHOLD: 1e-8 // 计算阈值
  }
};

/**
 * 坐标转换器类
 * 采用单例模式，确保全局唯一实例
 * 
 * @class CoordinateTransformer
 * @example
 * ```typescript
 * // 基础使用
 * const result = transform([116.404, 39.915], CoordSystem.WGS84, CoordSystem.GCJ02);
 * 
 * // 批量转换
 * const points = batchTransform(coordinates, CoordSystem.WGS84, CoordSystem.BD09);
 * 
 * // 计算距离
 * const distance = getDistance(point1, point2, CoordSystem.GCJ02);
 * ```
 */
class CoordinateTransformer {
  private static instance: CoordinateTransformer;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): CoordinateTransformer {
    if (!CoordinateTransformer.instance) {
      CoordinateTransformer.instance = new CoordinateTransformer();
    }
    return CoordinateTransformer.instance;
  }

  /**
   * 统一坐标转换入口
   * 支持多种输入格式，自动进行标准化处理
   * 
   * @param {Coordinate | Point | LatLng} coord - 源坐标
   * @param {CoordSystem} from - 源坐标系
   * @param {CoordSystem} to - 目标坐标系
   * @returns {Coordinate} 转换后的标准坐标对象
   * @throws {CoordinateError} 当输入坐标无效时抛出错误
   * 
   * @example
   * ```typescript
   * // 支持多种输入格式
   * transform([116.404, 39.915], CoordSystem.WGS84, CoordSystem.GCJ02);
   * transform({ lat: 39.915, lng: 116.404 }, CoordSystem.WGS84, CoordSystem.GCJ02);
   * transform({ latitude: 39.915, longitude: 116.404 }, CoordSystem.WGS84, CoordSystem.GCJ02);
   * ```
   */
  public transform(
    coord: Coordinate | Point | LatLng,
    from: CoordSystem,
    to: CoordSystem
  ): Coordinate {
    const normalizedCoord = this.normalizeCoordinate(coord);
    // 参数校验
    this.validateCoordinate(normalizedCoord);
    
    if (from === to) {
      return this.cloneCoordinate(normalizedCoord);
    }

    // 转换管道：将所有坐标先转为WGS84，再转为目标坐标系
    const wgs84Coord = this.toWGS84(normalizedCoord, from);
    return this.fromWGS84(wgs84Coord, to);
  }

  /**
   * 标准化不同格式的坐标输入
   */
  private normalizeCoordinate(coord: Coordinate | Point | LatLng): Coordinate {
    if (Array.isArray(coord)) {
      return { longitude: coord[0], latitude: coord[1] };
    }
    if ('lat' in coord && 'lng' in coord) {
      return { longitude: coord.lng, latitude: coord.lat };
    }
    return coord as Coordinate;
  }

  /**
   * 将任意坐标系转换为WGS84
   */
  private toWGS84(coord: Coordinate, from: CoordSystem): Coordinate {
    switch (from) {
      case CoordSystem.WGS84:
        return this.cloneCoordinate(coord);
      case CoordSystem.GCJ02:
        return this.gcj02ToWGS84(coord);
      case CoordSystem.BD09:
        return this.gcj02ToWGS84(this.bd09ToGCJ02(coord));
      default:
        throw new CoordinateError(`不支持的源坐标系: ${from}`);
    }
  }

  /**
   * 将WGS84转换为目标坐标系
   */
  private fromWGS84(coord: Coordinate, to: CoordSystem): Coordinate {
    switch (to) {
      case CoordSystem.WGS84:
        return this.cloneCoordinate(coord);
      case CoordSystem.GCJ02:
        return this.wgs84ToGCJ02(coord);
      case CoordSystem.BD09:
        return this.gcj02ToBD09(this.wgs84ToGCJ02(coord));
      default:
        throw new CoordinateError(`不支持的目标坐标系: ${to}`);
    }
  }

  /**
   * GCJ02 转 WGS84
   */
  private gcj02ToWGS84(coord: Coordinate): Coordinate {
    if (this.isOutOfChina(coord)) {
      return this.cloneCoordinate(coord);
    }

    let wgs84 = this.cloneCoordinate(coord);
    let gcj02 = this.wgs84ToGCJ02(wgs84);
    let delta = {
      longitude: gcj02.longitude - coord.longitude,
      latitude: gcj02.latitude - coord.latitude
    };

    while (Math.abs(delta.longitude) > CONFIG.PRECISION.THRESHOLD || 
           Math.abs(delta.latitude) > CONFIG.PRECISION.THRESHOLD) {
      wgs84 = {
        longitude: wgs84.longitude - delta.longitude,
        latitude: wgs84.latitude - delta.latitude
      };
      gcj02 = this.wgs84ToGCJ02(wgs84);
      delta = {
        longitude: gcj02.longitude - coord.longitude,
        latitude: gcj02.latitude - coord.latitude
      };
    }

    return this.roundCoordinate(wgs84);
  }

  /**
   * WGS84 转 GCJ02
   */
  private wgs84ToGCJ02(coord: Coordinate): Coordinate {
    if (this.isOutOfChina(coord)) {
      return this.cloneCoordinate(coord);
    }

    const { longitude, latitude } = coord;
    const [dLng, dLat] = this.calculateOffset(longitude - 105.0, latitude - 35.0);
    
    const radLat = latitude / 180.0 * CONFIG.TRANSFORM.PI;
    const magic = Math.sin(radLat);
    const sqrtMagic = Math.sqrt(1 - CONFIG.ELLIPSOID.EE * magic * magic);

    const latOffset = (dLat * 180.0) / ((CONFIG.ELLIPSOID.A * (1 - CONFIG.ELLIPSOID.EE)) / (sqrtMagic * sqrtMagic * sqrtMagic) * CONFIG.TRANSFORM.PI);
    const lngOffset = (dLng * 180.0) / (CONFIG.ELLIPSOID.A / sqrtMagic * Math.cos(radLat) * CONFIG.TRANSFORM.PI);

    return this.roundCoordinate({
      longitude: longitude + lngOffset,
      latitude: latitude + latOffset
    });
  }

  /**
   * BD09 转 GCJ02
   */
  private bd09ToGCJ02(coord: Coordinate): Coordinate {
    const x = coord.longitude - 0.0065;
    const y = coord.latitude - 0.006;
    
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * CONFIG.TRANSFORM.X_PI);
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * CONFIG.TRANSFORM.X_PI);
    
    return this.roundCoordinate({
      longitude: z * Math.cos(theta),
      latitude: z * Math.sin(theta)
    });
  }

  /**
   * GCJ02 转 BD09
   */
  private gcj02ToBD09(coord: Coordinate): Coordinate {
    const z = Math.sqrt(coord.longitude * coord.longitude + coord.latitude * coord.latitude) 
            + 0.00002 * Math.sin(coord.latitude * CONFIG.TRANSFORM.X_PI);
    const theta = Math.atan2(coord.latitude, coord.longitude) 
                + 0.000003 * Math.cos(coord.longitude * CONFIG.TRANSFORM.X_PI);
    
    return this.roundCoordinate({
      longitude: z * Math.cos(theta) + 0.0065,
      latitude: z * Math.sin(theta) + 0.006
    });
  }

  private isOutOfChina(coord: Coordinate): boolean {
    const { LAT, LNG } = CONFIG.TRANSFORM.CHINA_BOUNDS;
    return coord.longitude < LNG.MIN || coord.longitude > LNG.MAX ||
           coord.latitude < LAT.MIN || coord.latitude > LAT.MAX;
  }

  private calculateOffset(dLng: number, dLat: number): [number, number] {
    // 经度偏移
    let dL = this.transformLng(dLng, dLat);
    // 纬度偏移
    let dB = this.transformLat(dLng, dLat);
    return [dL, dB];
  }

  private transformLng(x: number, y: number): number {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * CONFIG.TRANSFORM.PI) + 20.0 * Math.sin(2.0 * x * CONFIG.TRANSFORM.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * CONFIG.TRANSFORM.PI) + 40.0 * Math.sin(x / 3.0 * CONFIG.TRANSFORM.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * CONFIG.TRANSFORM.PI) + 300.0 * Math.sin(x / 30.0 * CONFIG.TRANSFORM.PI)) * 2.0 / 3.0;
    return ret;
  }

  private transformLat(x: number, y: number): number {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * CONFIG.TRANSFORM.PI) + 20.0 * Math.sin(2.0 * x * CONFIG.TRANSFORM.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * CONFIG.TRANSFORM.PI) + 40.0 * Math.sin(y / 3.0 * CONFIG.TRANSFORM.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * CONFIG.TRANSFORM.PI) + 320 * Math.sin(y * CONFIG.TRANSFORM.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  private validateCoordinate(coord: Coordinate): void {
    const { longitude, latitude } = coord;
    
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new CoordinateError('坐标值必须是有限数值');
    }

    if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
      throw new CoordinateError('无效的坐标范围');
    }
  }

  private roundCoordinate(coord: Coordinate): Coordinate {
    const factor = Math.pow(10, CONFIG.PRECISION.COORDINATE);
    return {
      longitude: Math.round(coord.longitude * factor) / factor,
      latitude: Math.round(coord.latitude * factor) / factor
    };
  }

  private cloneCoordinate(coord: Coordinate): Coordinate {
    return { ...coord };
  }

  /**
   * 批量转换坐标点
   * @param coords - 坐标点数组
   * @param from - 源坐标系
   * @param to - 目标坐标系
   */
  public batchTransform(
    coords: Coordinate[],
    from: CoordSystem,
    to: CoordSystem
  ): Coordinate[] {
    return coords.map(coord => this.transform(coord, from, to));
  }

  /**
   * 计算两点之间的大圆距离
   * 使用 Haversine 公式计算地球表面两点间的最短距离
   * 
   * @param {Coordinate} coord1 - 第一个坐标点
   * @param {Coordinate} coord2 - 第二个坐标点
   * @param {CoordSystem} [system=CoordSystem.WGS84] - 坐标系统
   * @returns {number} 距离，单位：米
   * 
   * @example
   * ```typescript
   * const distance = getDistance(
   *   { longitude: 116.404, latitude: 39.915 },
   *   { longitude: 116.405, latitude: 39.916 },
   *   CoordSystem.GCJ02
   * );
   * ```
   */
  public getDistance(
    coord1: Coordinate,
    coord2: Coordinate,
    system: CoordSystem = CoordSystem.WGS84
  ): number {
    // 先转换为WGS84坐标系
    const point1 = this.transform(coord1, system, CoordSystem.WGS84);
    const point2 = this.transform(coord2, system, CoordSystem.WGS84);

    const R = 6371000; // 地球平均半径（米）
    const rad = Math.PI / 180;

    const lat1 = point1.latitude * rad;
    const lat2 = point2.latitude * rad;
    const lon1 = point1.longitude * rad;
    const lon2 = point2.longitude * rad;

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  /**
   * 检查点是否在多边形内
   * @param point - 待检查的点
   * @param polygon - 多边形的顶点数组
   * @param system - 坐标系统
   */
  public isPointInPolygon(
    point: Coordinate,
    polygon: Coordinate[],
    system: CoordSystem = CoordSystem.WGS84
  ): boolean {
    // 转换为相同坐标系
    const targetPoint = this.transform(point, system, CoordSystem.WGS84);
    const vertices = polygon.map(p => this.transform(p, system, CoordSystem.WGS84));

    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].longitude, yi = vertices[i].latitude;
      const xj = vertices[j].longitude, yj = vertices[j].latitude;
      
      const intersect = ((yi > targetPoint.latitude) !== (yj > targetPoint.latitude))
          && (targetPoint.longitude < (xj - xi) * (targetPoint.latitude - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * 计算多边形面积（平方米）
   * @param polygon - 多边形顶点数组
   * @param system - 坐标系统
   */
  public calculatePolygonArea(
    polygon: Coordinate[],
    system: CoordSystem = CoordSystem.WGS84
  ): number {
    if (polygon.length < 3) return 0;

    // 转换为WGS84坐标系
    const vertices = polygon.map(p => this.transform(p, system, CoordSystem.WGS84));
    
    const R = 6371000; // 地球平均半径（米）
    const rad = Math.PI / 180;

    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      
      const xi = vertices[i].longitude * rad;
      const yi = vertices[i].latitude * rad;
      const xj = vertices[j].longitude * rad;
      const yj = vertices[j].latitude * rad;

      area += xi * Math.sin(yj) - xj * Math.sin(yi);
    }

    area = Math.abs(area * R * R / 2);
    return area;
  }

  /**
   * 获取坐标点的偏移坐标
   * @param coord - 原始坐标
   * @param distance - 偏移距离（米）
   * @param bearing - 方位角（度）
   * @param system - 坐标系统
   */
  public getOffsetCoordinate(
    coord: Coordinate,
    distance: number,
    bearing: number,
    system: CoordSystem = CoordSystem.WGS84
  ): Coordinate {
    // 验证输入参数
    if (!Number.isFinite(distance) || distance < 0) {
      throw new CoordinateError('偏移距离必须是正数');
    }
    
    if (!Number.isFinite(bearing) || bearing < 0 || bearing > 360) {
      throw new CoordinateError('方位角必须在0-360度之间');
    }

    // 转换为WGS84坐标系
    const wgs84Point = this.transform(coord, system, CoordSystem.WGS84);
    
    const R = 6371000; // 地球平均半径（米）
    const rad = Math.PI / 180;

    const lat1 = wgs84Point.latitude * rad;
    const lon1 = wgs84Point.longitude * rad;
    const brng = bearing * rad;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance/R) +
      Math.cos(lat1) * Math.sin(distance/R) * Math.cos(brng)
    );

    const lon2 = lon1 + Math.atan2(
      Math.sin(brng) * Math.sin(distance/R) * Math.cos(lat1),
      Math.cos(distance/R) - Math.sin(lat1) * Math.sin(lat2)
    );

    const newCoord = {
      longitude: (lon2 / rad + 540) % 360 - 180, // 标准化经度到 [-180, 180]
      latitude: lat2 / rad
    };

    // 转换回原坐标系
    return this.transform(newCoord, CoordSystem.WGS84, system);
  }

  /**
   * 转换为指定格式输出
   */
  public toPoint(coord: Coordinate): Point {
    return [coord.longitude, coord.latitude];
  }

  public toLatLng(coord: Coordinate): LatLng {
    return { lat: coord.latitude, lng: coord.longitude };
  }
}

// 导出单例实例和类型
export const transformer = CoordinateTransformer.getInstance();
export { CoordSystem, type Coordinate };

// 修改导出方式
export const transform = (
  coord: Coordinate | Point | LatLng,
  from: CoordSystem,
  to: CoordSystem
): Coordinate => transformer.transform(coord, from, to);

export const getDistance = (
  coord1: Coordinate,
  coord2: Coordinate,
  system: CoordSystem = CoordSystem.WGS84
): number => transformer.getDistance(coord1, coord2, system);

export const isPointInPolygon = (
  point: Coordinate,
  polygon: Coordinate[],
  system: CoordSystem = CoordSystem.WGS84
): boolean => transformer.isPointInPolygon(point, polygon, system);

export const calculatePolygonArea = (
  polygon: Coordinate[],
  system: CoordSystem = CoordSystem.WGS84
): number => transformer.calculatePolygonArea(polygon, system);

export const getOffsetCoordinate = (
  coord: Coordinate,
  distance: number,
  bearing: number,
  system: CoordSystem = CoordSystem.WGS84
): Coordinate => transformer.getOffsetCoordinate(coord, distance, bearing, system);

// 导出便捷转换函数
export const toGCJ02 = (coord: Coordinate | Point | LatLng): Coordinate => 
  transformer.transform(coord, CoordSystem.WGS84, CoordSystem.GCJ02);

export const toBD09 = (coord: Coordinate | Point | LatLng): Coordinate => 
  transformer.transform(coord, CoordSystem.WGS84, CoordSystem.BD09);

export const toWGS84 = (coord: Coordinate | Point | LatLng, from: CoordSystem): Coordinate => 
  transformer.transform(coord, from, CoordSystem.WGS84);

// 导出格式转换函数
export const toPoint = (coord: Coordinate): Point => transformer.toPoint(coord);
export const toLatLng = (coord: Coordinate): LatLng => transformer.toLatLng(coord);

// 导出错误类型
export class CoordinateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoordinateError';
  }
}

// 导出常用常量
export const EARTH_RADIUS = 6371000; // 地球平均半径（米）
export const DEGREES_TO_RADIANS = Math.PI / 180;
export const RADIANS_TO_DEGREES = 180 / Math.PI;

// 导出辅助函数
export const createBoundingBox = (coords: Coordinate[]): BoundingBox => {
  if (!coords.length) {
    throw new CoordinateError('坐标数组不能为空');
  }

  return coords.reduce(
    (box, coord) => ({
      minLat: Math.min(box.minLat, coord.latitude),
      maxLat: Math.max(box.maxLat, coord.latitude),
      minLng: Math.min(box.minLng, coord.longitude),
      maxLng: Math.max(box.maxLng, coord.longitude)
    }),
    {
      minLat: coords[0].latitude,
      maxLat: coords[0].latitude,
      minLng: coords[0].longitude,
      maxLng: coords[0].longitude
    }
  );
};
