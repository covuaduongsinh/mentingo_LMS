import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { baseResponse, BaseResponse, UUIDSchema, type UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { PermissionsGuard } from "src/common/guards/permissions.guard";

import {
  createWebhookEndpointBodySchema,
  createWebhookEndpointResponseSchema,
  deleteWebhookEndpointResponseSchema,
  listWebhookDeliveriesResponseSchema,
  listWebhookEndpointsResponseSchema,
  pingWebhookEndpointResponseSchema,
  rotateWebhookSecretResponseSchema,
  updateWebhookEndpointBodySchema,
  type CreateWebhookEndpointBody,
  type CreateWebhookEndpointResponse,
  type DeleteWebhookEndpointResponse,
  type PingWebhookEndpointResponse,
  type RotateWebhookSecretResponse,
  type UpdateWebhookEndpointBody,
  type WebhookDelivery,
  type WebhookEndpoint,
} from "./schemas/webhooks.schema";
import { WEBHOOK_PERMISSIONS } from "./webhooks.constants";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
@UseGuards(PermissionsGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get("endpoints")
  @RequirePermission(...WEBHOOK_PERMISSIONS)
  @Validate({ response: baseResponse(listWebhookEndpointsResponseSchema) })
  async listEndpoints(): Promise<BaseResponse<WebhookEndpoint[]>> {
    return new BaseResponse(await this.webhooksService.listEndpoints());
  }

  @Post("endpoints")
  @RequirePermission(...WEBHOOK_PERMISSIONS)
  @Validate({
    request: [{ type: "body", schema: createWebhookEndpointBodySchema }],
    response: baseResponse(createWebhookEndpointResponseSchema),
  })
  async createEndpoint(
    @Body() body: CreateWebhookEndpointBody,
  ): Promise<BaseResponse<CreateWebhookEndpointResponse>> {
    return new BaseResponse(await this.webhooksService.createEndpoint(body));
  }

  @Patch("endpoints/:id")
  @RequirePermission(...WEBHOOK_PERMISSIONS)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateWebhookEndpointBodySchema },
    ],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async updateEndpoint(
    @Param("id") id: UUIDType,
    @Body() body: UpdateWebhookEndpointBody,
  ): Promise<BaseResponse<{ id: UUIDType }>> {
    return new BaseResponse(await this.webhooksService.updateEndpoint(id, body));
  }

  @Post("endpoints/:id/rotate-secret")
  @RequirePermission(...WEBHOOK_PERMISSIONS)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(rotateWebhookSecretResponseSchema),
  })
  async rotateSecret(
    @Param("id") id: UUIDType,
  ): Promise<BaseResponse<RotateWebhookSecretResponse>> {
    return new BaseResponse(await this.webhooksService.rotateSecret(id));
  }

  @Post("endpoints/:id/ping")
  @RequirePermission(...WEBHOOK_PERMISSIONS)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(pingWebhookEndpointResponseSchema),
  })
  async pingEndpoint(
    @Param("id") id: UUIDType,
  ): Promise<BaseResponse<PingWebhookEndpointResponse>> {
    return new BaseResponse(await this.webhooksService.pingEndpoint(id));
  }

  @Delete("endpoints/:id")
  @RequirePermission(...WEBHOOK_PERMISSIONS)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(deleteWebhookEndpointResponseSchema),
  })
  async deleteEndpoint(
    @Param("id") id: UUIDType,
  ): Promise<BaseResponse<DeleteWebhookEndpointResponse>> {
    return new BaseResponse(await this.webhooksService.deleteEndpoint(id));
  }

  @Get("endpoints/:id/deliveries")
  @RequirePermission(...WEBHOOK_PERMISSIONS)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(listWebhookDeliveriesResponseSchema),
  })
  async listDeliveries(@Param("id") id: UUIDType): Promise<BaseResponse<WebhookDelivery[]>> {
    return new BaseResponse(await this.webhooksService.listDeliveries(id));
  }
}
