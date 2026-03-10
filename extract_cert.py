#!/usr/bin/env python3
"""
提取微信支付证书信息
"""

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
import sys

cert_path = 'certs/wechat/apiclient_cert.p12'

# 常见密码列表
passwords = [
    b'1106605743',  # 商户号
    b'wx0831611146088354',  # AppID
    b'',  # 空密码
    b'mch_id',  # mch_id
    b'123456',  # 常见密码
]

for pwd in passwords:
    try:
        print(f"尝试密码: {pwd}")

        with open(cert_path, 'rb') as f:
            p12_data = f.read()

        # 尝试使用传统方法加载
        try:
            from cryptography.hazmat.primitives.serialization import pkcs12
            private_key, cert, additional_certs = pkcs12.load_key_and_certificates(
                p12_data,
                pwd,
                backend=default_backend()
            )

            if cert:
                print("\n✓ 证书加载成功！\n")

                # 获取证书序列号
                serial_number = cert.serial_number
                serial_hex = format(serial_number, 'X')
                print(f"证书序列号: {serial_hex}")

                # 获取证书主题
                subject = cert.subject
                print(f"证书主题: {subject}")

                # 获取证书颁发者
                issuer = cert.issuer
                print(f"证书颁发者: {issuer}")

                # 获取证书有效期
                print(f"有效期: {cert.not_valid_before} 至 {cert.not_valid_after}")

                # 获取公钥信息
                public_key = cert.public_key()
                print(f"公钥类型: {type(public_key).__name__}")

                print("\n证书详细信息:")
                print("=" * 50)

                # 打印完整证书信息
                print(f"序列号: {serial_hex}")
                print(f"版本: {cert.version}")
                print(f"签名算法: {cert.signature_algorithm_oid._name}")
                print(f"有效期起: {cert.not_valid_before}")
                print(f"有效期止: {cert.not_valid_after}")
                print(f"颁发者: {issuer}")
                print(f"主题: {subject}")

                print("\n扩展信息:")
                for ext in cert.extensions:
                    print(f"  {ext.oid._name}: {ext.critical}")

                sys.exit(0)

        except Exception as e:
            print(f"pkcs12.load_key_and_certificates 失败: {e}")

    except Exception as e:
        print(f"密码 {pwd} 尝试失败: {e}")
        continue

print("\n所有密码尝试失败")
print("请检查证书密码是否正确")
