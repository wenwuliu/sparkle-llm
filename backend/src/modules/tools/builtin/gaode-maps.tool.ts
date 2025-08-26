/**
 * 高德地图MCP工具
 */
import axios from 'axios';
import { toolManager } from '../tool.manager';
import { ToolCategory } from '../tools.types';

// 高德地图API密钥
const GAODE_API_KEY = process.env.GAODE_API_KEY || '';

/**
 * 注册高德地图工具
 */
export function registerGaodeMapsTools(): void {
  // 地点搜索工具
  toolManager.registerTool({
    name: 'gaode_place_search',
    description: '搜索地点信息，包括景点、餐厅、酒店等',
    input_schema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'string',
          description: '搜索关键词，如"北京故宫"、"上海外滩附近的餐厅"等',
        },
        city: {
          type: 'string',
          description: '城市名称，如"北京"、"上海"等，可选',
        },
        types: {
          type: 'string',
          description: '兴趣点类型，如"餐饮|酒店"，可选',
        },
        limit: {
          type: 'integer',
          description: '返回结果数量限制',
          default: 10,
        },
      },
      required: ['keywords'],
    },
    handler: async (input: { keywords: string; city?: string; types?: string; limit?: number }) => {
      const { keywords, city, types, limit = 10 } = input;

      try {
        if (!GAODE_API_KEY) {
          throw new Error('未配置高德地图API密钥，请在.env文件中设置GAODE_API_KEY');
        }

        // 构建请求参数
        const params = {
          key: GAODE_API_KEY,
          keywords,
          city,
          types,
          offset: limit,
          extensions: 'all',
          output: 'JSON',
        };

        // 发送请求
        const response = await axios.get('https://restapi.amap.com/v3/place/text', { params });
        const data = response.data;

        if (data.status !== '1') {
          throw new Error(`高德地图API请求失败: ${data.info}`);
        }

        // 处理结果
        const places = data.pois.map((poi: any) => ({
          id: poi.id,
          name: poi.name,
          type: poi.type,
          address: poi.address,
          location: poi.location,
          tel: poi.tel,
          distance: poi.distance,
          rating: poi.biz_ext?.rating,
          photos: poi.photos?.map((photo: any) => photo.url) || [],
        }));

        return {
          success: true,
          count: places.length,
          places,
          raw_response: data,
        };
      } catch (error) {
        console.error('高德地图地点搜索错误:', error);
        return {
          success: false,
          error: `地点搜索失败: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    requires_auth: false,
    category: ToolCategory.UTILITY,
  });

  // 路线规划工具
  // toolManager.registerTool({
  //   name: 'gaode_route_planning',
  //   description: '规划两点或多点之间的路线，支持驾车、步行、公交等出行方式',
  //   input_schema: {
  //     type: 'object',
  //     properties: {
  //       origin: {
  //         type: 'string',
  //         description: '起点坐标，格式为"经度,纬度"，如"116.481028,39.989643"，或者地点名称，如"北京故宫"',
  //       },
  //       destination: {
  //         type: 'string',
  //         description: '终点坐标，格式为"经度,纬度"，如"116.434446,39.90816"，或者地点名称，如"北京天安门"',
  //       },
  //       waypoints: {
  //         type: 'string',
  //         description: '途经点坐标，格式为"经度1,纬度1;经度2,纬度2"，或者地点名称，如"北京动物园;北京天文馆"，可选',
  //       },
  //       mode: {
  //         type: 'string',
  //         description: '出行方式，可选值为"driving"（驾车）、"walking"（步行）、"transit"（公交）、"bicycling"（骑行）',
  //         default: 'driving',
  //       },
  //       city: {
  //         type: 'string',
  //         description: '城市名称，如"北京"、"上海"等，公交路线规划时必填',
  //       },
  //     },
  //     required: ['origin', 'destination'],
  //   },
  //   handler: async (input: {
  //     origin: string;
  //     destination: string;
  //     waypoints?: string;
  //     mode?: string;
  //     city?: string;
  //   }) => {
  //     const { origin, destination, waypoints, mode = 'driving', city } = input;

  //     try {
  //       if (!GAODE_API_KEY) {
  //         throw new Error('未配置高德地图API密钥，请在.env文件中设置GAODE_API_KEY');
  //       }

  //       // 首先尝试将地点名称转换为坐标
  //       async function getCoordinates(place: string): Promise<string> {
  //         // 如果已经是坐标格式，直接返回
  //         if (/^\d+\.\d+,\d+\.\d+$/.test(place)) {
  //           return place;
  //         }

  //         // 否则，使用地点搜索API获取坐标
  //         const searchParams = {
  //           key: GAODE_API_KEY,
  //           keywords: place,
  //           offset: 1,
  //           extensions: 'base',
  //           output: 'JSON',
  //         };

  //         const searchResponse = await axios.get('https://restapi.amap.com/v3/place/text', { params: searchParams });
  //         const searchData = searchResponse.data;

  //         if (searchData.status !== '1' || !searchData.pois || searchData.pois.length === 0) {
  //           throw new Error(`无法找到地点: ${place}`);
  //         }

  //         return searchData.pois[0].location;
  //       }

  //       // 获取起点和终点的坐标
  //       const originCoords = await getCoordinates(origin);
  //       const destinationCoords = await getCoordinates(destination);

  //       // 处理途经点坐标
  //       let waypointsCoords = '';
  //       if (waypoints) {
  //         const waypointsList = waypoints.split(';');
  //         const waypointsCoordsArray = [];

  //         for (const point of waypointsList) {
  //           const coords = await getCoordinates(point);
  //           waypointsCoordsArray.push(coords);
  //         }

  //         waypointsCoords = waypointsCoordsArray.join(';');
  //       }

  //       // 根据出行方式选择不同的API
  //       let apiUrl = '';
  //       const params: any = {
  //         key: GAODE_API_KEY,
  //         output: 'JSON',
  //       };

  //       switch (mode) {
  //         case 'driving':
  //           apiUrl = 'https://restapi.amap.com/v3/direction/driving';
  //           params.origin = originCoords;
  //           params.destination = destinationCoords;
  //           if (waypointsCoords) params.waypoints = waypointsCoords;
  //           params.strategy = 10; // 默认使用时间最短策略
  //           break;
  //         case 'walking':
  //           apiUrl = 'https://restapi.amap.com/v3/direction/walking';
  //           params.origin = originCoords;
  //           params.destination = destinationCoords;
  //           break;
  //         case 'transit':
  //           apiUrl = 'https://restapi.amap.com/v3/direction/transit/integrated';
  //           params.origin = originCoords;
  //           params.destination = destinationCoords;
  //           params.city = city || '北京'; // 默认使用北京
  //           break;
  //         case 'bicycling':
  //           apiUrl = 'https://restapi.amap.com/v4/direction/bicycling';
  //           params.origin = originCoords;
  //           params.destination = destinationCoords;
  //           break;
  //         default:
  //           throw new Error(`不支持的出行方式: ${mode}`);
  //       }

  //       // 发送请求
  //       const response = await axios.get(apiUrl, { params });
  //       const data = response.data;

  //       if (data.status !== '1') {
  //         throw new Error(`高德地图API请求失败: ${data.info}`);
  //       }

  //       // 生成可视化地图链接
  //       let mapUrl = `https://uri.amap.com/marker?markers=${originCoords},${destinationCoords}`;
  //       if (waypointsCoords) {
  //         const waypointsList = waypointsCoords.split(';');
  //         for (const point of waypointsList) {
  //           mapUrl += `,${point}`;
  //         }
  //       }
  //       mapUrl += '&src=mypage&callnative=1';

  //       // 处理结果
  //       return {
  //         success: true,
  //         mode,
  //         origin_name: origin,
  //         destination_name: destination,
  //         origin_coords: originCoords,
  //         destination_coords: destinationCoords,
  //         route: data.route || data.data,
  //         map_url: mapUrl,
  //         raw_response: data,
  //       };
  //     } catch (error) {
  //       console.error('高德地图路线规划错误:', error);
  //       return {
  //         success: false,
  //         error: `路线规划失败: ${error instanceof Error ? error.message : String(error)}`,
  //       };
  //     }
  //   },
  //   requires_auth: false,
  //   category: ToolCategory.UTILITY,
  // });

  // 天气查询工具
  toolManager.registerTool({
    name: 'gaode_weather',
    description: '查询指定城市的天气情况',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，如"北京"、"上海"等，或者城市编码',
        },
        extensions: {
          type: 'string',
          description: '气象类型，可选值为"base"（实况天气）、"all"（预报天气）',
          default: 'all',
        },
      },
      required: ['city'],
    },
    handler: async (input: { city: string; extensions?: string }) => {
      const { city, extensions = 'all' } = input;

      try {
        if (!GAODE_API_KEY) {
          throw new Error('未配置高德地图API密钥，请在.env文件中设置GAODE_API_KEY');
        }

        // 构建请求参数
        const params = {
          key: GAODE_API_KEY,
          city,
          extensions,
          output: 'JSON',
        };

        // 发送请求
        const response = await axios.get('https://restapi.amap.com/v3/weather/weatherInfo', { params });
        const data = response.data;

        if (data.status !== '1') {
          throw new Error(`高德地图API请求失败: ${data.info}`);
        }

        return {
          success: true,
          weather: data.lives || data.forecasts,
          raw_response: data,
        };
      } catch (error) {
        console.error('高德地图天气查询错误:', error);
        return {
          success: false,
          error: `天气查询失败: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    requires_auth: false,
    category: ToolCategory.UTILITY,
  });
}
