import asyncio
import asyncpg
import sys

async def main():
    try:
        conn = await asyncpg.connect('postgresql://01capital:01capital@localhost:5432/01capital')
        print("Success")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

asyncio.run(main())
