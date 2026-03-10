#!/usr/bin/env python3
"""
提取微信支付证书信息并转换为PEM格式
"""

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
import sys

cert_path = 'certs/wechat/apiclient_cert.p12'
password = b'1106605743'

try:
    with open(cert_path, 'rb') as f:
        p12_data = f.read()

    from cryptography.hazmat.primitives.serialization import pkcs12
    private_key, cert, additional_certs = pkcs12.load_key_and_certificates(
        p12_data,
        password,
        backend=default_backend()
    )

    print("=" * 60)
    print("微信支付证书信息")
    print("=" * 60)

    # 1. 证书序列号
    serial_number = cert.serial_number
    serial_hex = format(serial_number, 'X')
    print(f"\n【证书序列号】")
    print(f"  序列号: {serial_hex}")
    print(f"  长度: {len(serial_hex)} 位")

    # 2. 证书基本信息
    print(f"\n【基本信息】")
    print(f"  版本: {cert.version.name}")
    print(f"  签名算法: {cert.signature_algorithm_oid._name}")

    # 3. 证书有效期
    print(f"\n【有效期】")
    print(f"  生效时间: {cert.not_valid_before}")
    print(f"  失效时间: {cert.not_valid_after}")
    print(f"  有效天数: {(cert.not_valid_after - cert.not_valid_before).days} 天")

    # 4. 证书颁发者
    print(f"\n【证书颁发者】")
    for attr in cert.issuer:
        print(f"  {attr.oid._name}: {attr.value}")

    # 5. 证书主题（商户信息）
    print(f"\n【证书主题】")
    for attr in cert.subject:
        print(f"  {attr.oid._name}: {attr.value}")

    # 6. 公钥信息
    print(f"\n【公钥信息】")
    public_key = cert.public_key()
    print(f"  密钥类型: {type(public_key).__name__}")
    if hasattr(public_key, 'key_size'):
        print(f"  密钥长度: {public_key.key_size} 位")

    # 7. 证书密码
    print(f"\n【证书密码】")
    print(f"  密码: {password.decode('utf-8')} (商户号)")

    # 8. 证书文件信息
    import os
    file_size = os.path.getsize(cert_path)
    print(f"\n【文件信息】")
    print(f"  文件路径: {cert_path}")
    print(f"  文件大小: {file_size} 字节")

    # 转换为PEM格式
    print(f"\n【证书转换】")

    # 保存证书为PEM格式
    cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
    with open('certs/wechat/apiclient_cert.pem', 'w') as f:
        f.write(cert_pem)
    print(f"  ✓ 证书已保存为: certs/wechat/apiclient_cert.pem")

    # 保存私钥为PEM格式（可选）
    if private_key:
        key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        with open('certs/wechat/apiclient_key.pem', 'w') as f:
            f.write(key_pem)
        print(f"  ✓ 私钥已保存为: certs/wechat/apiclient_key.pem")

    print("\n" + "=" * 60)
    print("证书信息提取完成！")
    print("=" * 60)

except Exception as e:
    print(f"\n错误: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
