import jwt from 'jsonwebtoken';
// JWT配置（依赖 .env 已在 server.ts 入口处加载）
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_ISSUER = process.env.JWT_ISSUER || 'auth0';
const JWT_EXPIRES_IN = '7d';

// 认证服务类
export class AuthService {
  // 生成JWT令牌
  static createToken(userId: number, userType: string): string {
    return jwt.sign(
      { userId, userType },
      JWT_SECRET,
      {
        issuer: JWT_ISSUER,
        expiresIn: JWT_EXPIRES_IN,
        algorithm: 'HS256'
      }
    );
  }

  // 验证JWT令牌
  static verifyToken(token: string): { userId: string; userType: string } | null {
    try {
      return jwt.verify(
        token,
        JWT_SECRET,
        {
          issuer: JWT_ISSUER,
          algorithms: ['HS256']
        }
      ) as unknown as { userId: string; userType: string };
    } catch (error) {
      console.error('验证Token失败', error);
      return null;
    }
  }

  // 根据Token获取用户ID
  static getUserIdFromToken(token: string): number | null {
    const payload = this.verifyToken(token);
    return payload ? parseInt(payload.userId, 10) : null;
  }

  // 检查是否是管理员
  static isAdmin(token: string): boolean {
    const payload = this.verifyToken(token);
    return payload ? payload.userType === '1' : false;
  }

  // 检查是否是普通用户
  static isUser(token: string): boolean {
    const payload = this.verifyToken(token);
    return payload ? payload.userType === '0' : false;
  }
}
