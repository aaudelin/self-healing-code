import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSchema, TableSchema, ColumnSchema } from '@aiops/shared';

interface SupabaseColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface SupabaseTable {
  table_name: string;
}

@Injectable()
export class SupabaseIntegrationService {
  private readonly url: string | undefined;
  private readonly serviceKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('SUPABASE_URL');
    this.serviceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
  }

  async testConnection(
    _config: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.url || !this.serviceKey) {
      return {
        success: false,
        message: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not configured',
      };
    }

    try {
      const response = await fetch(`${this.url}/rest/v1/`, {
        headers: {
          apikey: this.serviceKey,
          Authorization: `Bearer ${this.serviceKey}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Supabase API error: ${response.status}`,
        };
      }

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async fetchSchema(_config: Record<string, string>): Promise<DatabaseSchema> {
    if (!this.url || !this.serviceKey) {
      return this.getMockSchema();
    }

    try {
      const tablesResponse = await fetch(
        `${this.url}/rest/v1/?apikey=${this.serviceKey}`,
        {
          headers: {
            apikey: this.serviceKey,
            Authorization: `Bearer ${this.serviceKey}`,
          },
        },
      );

      if (!tablesResponse.ok) {
        return this.getMockSchema();
      }

      const rpcResponse = await fetch(`${this.url}/rest/v1/rpc/get_tables`, {
        method: 'POST',
        headers: {
          apikey: this.serviceKey,
          Authorization: `Bearer ${this.serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!rpcResponse.ok) {
        return this.getMockSchema();
      }

      const tablesData = (await rpcResponse.json()) as SupabaseTable[];
      const tables: TableSchema[] = [];

      for (const table of tablesData) {
        const columnsResponse = await fetch(
          `${this.url}/rest/v1/rpc/get_columns`,
          {
            method: 'POST',
            headers: {
              apikey: this.serviceKey,
              Authorization: `Bearer ${this.serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ table_name: table.table_name }),
          },
        );

        if (columnsResponse.ok) {
          const columnsData = (await columnsResponse.json()) as SupabaseColumn[];
          const columns: ColumnSchema[] = columnsData.map(
            (col: SupabaseColumn) => ({
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === 'YES',
              defaultValue: col.column_default || undefined,
            }),
          );

          tables.push({
            name: table.table_name,
            columns,
          });
        }
      }

      return tables.length > 0 ? { tables } : this.getMockSchema();
    } catch (error) {
      console.error('Error fetching Supabase schema:', error);
      return this.getMockSchema();
    }
  }

  private getMockSchema(): DatabaseSchema {
    return {
      tables: [
        {
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              nullable: false,
              isPrimaryKey: true,
            },
            { name: 'name', type: 'text', nullable: false },
            { name: 'email', type: 'text', nullable: false },
            { name: 'created_at', type: 'timestamp', nullable: false },
          ],
        },
        {
          name: 'orders',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              nullable: false,
              isPrimaryKey: true,
            },
            {
              name: 'user_id',
              type: 'uuid',
              nullable: false,
              isForeignKey: true,
              references: { table: 'users', column: 'id' },
            },
            { name: 'total', type: 'decimal', nullable: false },
            { name: 'status', type: 'text', nullable: false },
            { name: 'created_at', type: 'timestamp', nullable: false },
          ],
        },
        {
          name: 'order_items',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              nullable: false,
              isPrimaryKey: true,
            },
            {
              name: 'order_id',
              type: 'uuid',
              nullable: false,
              isForeignKey: true,
              references: { table: 'orders', column: 'id' },
            },
            { name: 'product_name', type: 'text', nullable: false },
            { name: 'quantity', type: 'integer', nullable: false },
            { name: 'price', type: 'decimal', nullable: false },
          ],
        },
      ],
    };
  }
}
