"use client"

import { useState, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Copy, Home, Link, Pencil, ShieldCheck, ShieldOff, Trash2, UserPlus } from "lucide-react"
import {
  useHousehold,
  useCreateInvite,
  useCreateUser,
  useRemoveMember,
  useUpdateMemberRole,
  useRevokeInvite,
  useAdminToggle2FA,
  useAdminEditUser,
  useDeleteProvisionedUser,
  useUpdateHouseholdName,
  type HouseholdMember,
} from "@/hooks/useHousehold"
import {
  buildCreateUserSchema,
  buildEditUserSchema,
  buildUpdateHouseholdNameSchema,
  type CreateUserInput,
  type EditUserInput,
  type UpdateHouseholdNameInput,
} from "@/lib/validations/household"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n/context"

function initials(name: string | null, username: string) {
  const base = name ?? username
  return base.slice(0, 2).toUpperCase()
}

function EditUserDialog({
  member,
  onClose,
}: {
  member: HouseholdMember
  onClose: () => void
}) {
  const { locale, t, translateApiError: mapErr } = useI18n()
  const displayNamePlaceholder = t("household.displayNamePlaceholder")
  const usernamePlaceholder = t("household.usernamePlaceholder")
  const editSchema = useMemo(() => buildEditUserSchema(locale), [locale])
  const editUser = useAdminEditUser()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditUserInput>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: member.name ?? "", username: member.email },
  })

  async function onSubmit(form: EditUserInput) {
    const payload: EditUserInput = {}
    if (form.name !== undefined && form.name !== (member.name ?? "")) payload.name = form.name
    if (form.username !== undefined && form.username !== member.email) payload.username = form.username
    if (form.password) payload.password = form.password

    if (Object.keys(payload).length === 0) {
      toast.info(t("household.noChanges"))
      onClose()
      return
    }

    try {
      await editUser.mutateAsync({ userId: member.userId, data: payload })
      toast.success(t("household.userUpdated"))
      onClose()
    } catch (err: unknown) {
      toast.error(mapErr(err))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("household.editUser")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="edit-name">{t("household.displayName")}</Label>
            <Input id="edit-name" placeholder={displayNamePlaceholder} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-username">{t("household.usernameLogin")}</Label>
            <Input id="edit-username" placeholder={usernamePlaceholder} {...register("username")} />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-password">{t("household.newPassword")}</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder={t("household.leaveBlankUnchanged")}
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function HouseholdContent() {
  const { locale, t, formatDate: fmtDate, translateApiError: mapErr } = useI18n()
  const userSchema = useMemo(() => buildCreateUserSchema(locale), [locale])
  const householdNameSchema = useMemo(() => buildUpdateHouseholdNameSchema(locale), [locale])
  const { data, isLoading } = useHousehold()

  const ROLE_LABELS: Record<string, string> = {
    OWNER: t("household.owner"),
    ADMIN: t("household.admin"),
    MEMBER: t("household.member"),
  }
  const createInvite = useCreateInvite()
  const createUser = useCreateUser()
  const removeMember = useRemoveMember()
  const updateRole = useUpdateMemberRole()
  const revokeInvite = useRevokeInvite()
  const toggle2FA = useAdminToggle2FA()
  const deleteProvisionedUser = useDeleteProvisionedUser()
  const updateHouseholdName = useUpdateHouseholdName()
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null)
  const [editingHouseholdName, setEditingHouseholdName] = useState(false)

  const isOwner = data?.myRole === "OWNER"
  const canManage = data?.myRole === "OWNER" || data?.myRole === "ADMIN"

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: { tenancy: "household" },
  })

  const createTenancy = useWatch({ control, name: "tenancy" })

  const {
    register: registerHouseholdName,
    handleSubmit: handleSubmitHouseholdName,
    reset: resetHouseholdName,
    formState: { errors: householdNameErrors, isSubmitting: isSubmittingHouseholdName },
  } = useForm<UpdateHouseholdNameInput>({
    resolver: zodResolver(householdNameSchema),
  })

  function startEditHouseholdName() {
    resetHouseholdName({ name: data?.household?.name ?? "" })
    setEditingHouseholdName(true)
  }

  async function onUpdateHouseholdName(form: UpdateHouseholdNameInput) {
    try {
      await updateHouseholdName.mutateAsync(form.name)
      toast.success(t("household.householdNameUpdated"))
      setEditingHouseholdName(false)
    } catch {
      toast.error(t("household.updateFailed"))
    }
  }

  async function onCreateUser(form: CreateUserInput) {
    try {
      const payload: CreateUserInput = {
        ...form,
        householdName:
          form.tenancy === "tenant" && form.householdName?.trim()
            ? form.householdName.trim()
            : undefined,
      }
      const result = await createUser.mutateAsync(payload)
      if (result.tenancy === "tenant") {
        toast.success(t("household.tenantUserCreated", { username: result.username }))
      } else {
        toast.success(t("household.userCreated", { username: result.username }))
      }
      reset({ tenancy: "household" })
    } catch (err: unknown) {
      toast.error(mapErr(err) || t("household.createFailed"))
    }
  }

  async function handleCreateInviteLink() {
    try {
      const result = await createInvite.mutateAsync()
      setInviteUrl(result.inviteUrl)
      toast.success(t("household.inviteCreated"))
    } catch {
      toast.error(t("household.inviteCreateFailed"))
    }
  }

  async function copyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    toast.success(t("household.linkCopied"))
  }

  async function handleRemove(userId: string, name: string | null) {
    if (!confirm(t("household.removeMemberConfirm", { name: name ?? t("household.defaultMemberName") }))) return
    try {
      await removeMember.mutateAsync(userId)
      toast.success(t("household.memberRemoved"))
    } catch {
      toast.error(t("household.removeFailed"))
    }
  }

  async function handleDeleteProvisioned(userId: string, name: string | null, username: string) {
    const label = name ?? username
    if (!confirm(t("household.deleteProvisionedConfirm", { name: label }))) return
    try {
      await deleteProvisionedUser.mutateAsync(userId)
      toast.success(t("household.provisionedUserDeleted"))
    } catch (err: unknown) {
      toast.error(mapErr(err))
    }
  }

  async function handleRoleChange(userId: string, role: "ADMIN" | "MEMBER") {
    try {
      await updateRole.mutateAsync({ userId, role })
      toast.success(t("household.roleUpdated"))
    } catch {
      toast.error(t("household.roleUpdateFailed"))
    }
  }

  async function handleToggle2FA(userId: string, currentlyEnabled: boolean) {
    const action = currentlyEnabled ? t("household.toggle2faDeactivate") : t("household.toggle2faActivate")
    if (!confirm(t("household.toggle2faConfirm", { action }))) return
    try {
      await toggle2FA.mutateAsync({ userId, enabled: !currentlyEnabled })
      toast.success(currentlyEnabled ? t("household.twoFactorDisabled") : t("household.twoFactorSetupRequired"))
    } catch {
      toast.error(t("household.twoFactorChangeFailed"))
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!confirm(t("household.revokeInviteConfirm"))) return
    try {
      await revokeInvite.mutateAsync(inviteId)
      toast.success(t("household.inviteRevoked"))
    } catch {
      toast.error(t("household.revokeFailed"))
    }
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("household.loading")}</p>
  }

  return (
    <div className="space-y-6">
      {editingMember && (
        <EditUserDialog member={editingMember} onClose={() => setEditingMember(null)} />
      )}

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {t("household.createUser")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onCreateUser)} className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("household.tenancyLabel")}</legend>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      value="household"
                      className="size-4"
                      {...register("tenancy")}
                    />
                    {t("household.tenancyHousehold")}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      value="tenant"
                      className="size-4"
                      {...register("tenancy")}
                    />
                    {t("household.tenancyTenant")}
                  </label>
                </div>
              </fieldset>
              {createTenancy === "tenant" && (
                <div className="space-y-1 max-w-md">
                  <Label htmlFor="tenant-household-name">{t("household.tenantHouseholdName")}</Label>
                  <Input
                    id="tenant-household-name"
                    placeholder={t("household.tenantHouseholdNamePlaceholder")}
                    {...register("householdName")}
                  />
                  {errors.householdName && (
                    <p className="text-xs text-destructive">{errors.householdName.message}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name">{t("household.displayName")}</Label>
                  <Input id="name" placeholder={t("household.displayNamePlaceholder")} {...register("name")} />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="username">{t("household.username")}</Label>
                  <Input id="username" placeholder={t("household.usernamePlaceholder")} {...register("username")} />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">{t("household.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("household.minPassword")}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {t("household.create")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link className="h-4 w-4" />
              {t("household.inviteLink")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("household.inviteDescription")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateInviteLink}
              disabled={createInvite.isPending}
            >
              {t("household.generateLink")}
            </Button>
            {inviteUrl && (
              <div className="flex flex-col gap-2 p-3 rounded-md bg-muted text-sm break-all sm:flex-row sm:items-center">
                <span className="flex-1">{inviteUrl}</span>
                <Button type="button" size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4" />
            {t("household.householdName")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingHouseholdName ? (
            <form onSubmit={handleSubmitHouseholdName(onUpdateHouseholdName)} className="flex max-w-sm flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-1">
                <Input
                  autoFocus
                  placeholder={t("household.householdNamePlaceholder")}
                  {...registerHouseholdName("name")}
                />
                {householdNameErrors.name && (
                  <p className="text-xs text-destructive">{householdNameErrors.name.message}</p>
                )}
              </div>
              <Button type="submit" disabled={isSubmittingHouseholdName}>
                {t("common.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingHouseholdName(false)}
              >
                {t("common.cancel")}
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">{data?.household?.name ?? t("common.dash")}</span>
              {canManage && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={startEditHouseholdName}
                  title={t("household.editHouseholdName")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("household.members")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {data?.members.map((m) => (
              <div key={m.id} className="rounded-lg border p-3">
                <div className="mb-3 flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs">
                      {initials(m.name, m.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.name ?? t("common.dash")}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                    <p className="text-xs text-muted-foreground">{t("household.tableJoined")}: {fmtDate(m.joinedAt)}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("household.tableRole")}</span>
                    {canManage && m.role !== "OWNER" ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          handleRoleChange(m.userId, v as "ADMIN" | "MEMBER")
                        }
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">{t("enums.role.ADMIN")}</SelectItem>
                          <SelectItem value="MEMBER">{t("enums.role.MEMBER")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("household.table2fa")}</span>
                    {canManage ? (
                      <button
                        type="button"
                        title={m.twoFactorEnabled ? t("household.disable2fa") : t("household.enable2fa")}
                        className="flex min-h-10 items-center gap-1 rounded-md px-2 text-xs"
                        onClick={() => handleToggle2FA(m.userId, m.twoFactorEnabled)}
                        disabled={toggle2FA.isPending}
                      >
                        {m.twoFactorEnabled ? (
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <ShieldOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={m.twoFactorEnabled ? "text-green-600" : "text-muted-foreground"}>
                          {m.twoFactorEnabled
                            ? (m.twoFactorConfigured ? t("household.twoFactorActive") : t("household.twoFactorPending"))
                            : t("household.twoFactorOff")}
                        </span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {m.twoFactorEnabled ? (
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <ShieldOff className="h-4 w-4" />
                        )}
                        {m.twoFactorEnabled
                          ? (m.twoFactorConfigured ? t("household.twoFactorActive") : t("household.twoFactorPending"))
                          : t("household.twoFactorOff")}
                      </span>
                    )}
                  </div>

                  {canManage && m.role !== "OWNER" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditingMember(m)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t("common.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleRemove(m.userId, m.name)}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("household.tableName")}</TableHead>
                <TableHead>{t("household.tableUsername")}</TableHead>
                <TableHead>{t("household.tableRole")}</TableHead>
                <TableHead>{t("household.table2fa")}</TableHead>
                <TableHead>{t("household.tableJoined")}</TableHead>
                {canManage && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {initials(m.name, m.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{m.name ?? t("common.dash")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    {canManage && m.role !== "OWNER" ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          handleRoleChange(m.userId, v as "ADMIN" | "MEMBER")
                        }
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">{t("enums.role.ADMIN")}</SelectItem>
                          <SelectItem value="MEMBER">{t("enums.role.MEMBER")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <button
                        type="button"
                        title={m.twoFactorEnabled ? t("household.disable2fa") : t("household.enable2fa")}
                        className="flex items-center gap-1 text-xs"
                        onClick={() => handleToggle2FA(m.userId, m.twoFactorEnabled)}
                        disabled={toggle2FA.isPending}
                      >
                        {m.twoFactorEnabled ? (
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <ShieldOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={m.twoFactorEnabled ? "text-green-600" : "text-muted-foreground"}>
                          {m.twoFactorEnabled
                            ? (m.twoFactorConfigured ? t("household.twoFactorActive") : t("household.twoFactorPending"))
                            : t("household.twoFactorOff")}
                        </span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {m.twoFactorEnabled ? (
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <ShieldOff className="h-4 w-4" />
                        )}
                        {m.twoFactorEnabled
                          ? (m.twoFactorConfigured ? t("household.twoFactorActive") : t("household.twoFactorPending"))
                          : t("household.twoFactorOff")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {fmtDate(m.joinedAt)}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {m.role !== "OWNER" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingMember(m)}
                            title={t("household.editUserTooltip")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {m.role !== "OWNER" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemove(m.userId, m.name)}
                            disabled={removeMember.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("household.provisionedUsers")}</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              {t("household.provisionedUsersDescription")}
            </p>
          </CardHeader>
          <CardContent>
            {(data?.provisionedUsers.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t("household.provisionedUsersEmpty")}</p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {data?.provisionedUsers.map((p) => (
                    <div key={p.userId} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs">
                            {initials(p.name, p.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{p.name ?? t("common.dash")}</p>
                          <p className="truncate text-sm text-muted-foreground">{p.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("household.tableHousehold")}: {p.householdName ?? t("common.dash")}
                          </p>
                        </div>
                        <Badge variant="outline">{t("household.tenantBadge")}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            setEditingMember({
                              id: p.userId,
                              userId: p.userId,
                              name: p.name,
                              email: p.username,
                              image: null,
                              role: "OWNER",
                              joinedAt: p.createdAt,
                              twoFactorEnabled: p.twoFactorEnabled,
                              twoFactorConfigured: false,
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleToggle2FA(p.userId, p.twoFactorEnabled)}
                          disabled={toggle2FA.isPending}
                        >
                          {p.twoFactorEnabled ? (
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                          ) : (
                            <ShieldOff className="h-4 w-4" />
                          )}
                          2FA
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteProvisioned(p.userId, p.name, p.username)}
                          disabled={deleteProvisionedUser.isPending}
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("household.tableName")}</TableHead>
                        <TableHead>{t("household.tableUsername")}</TableHead>
                        <TableHead>{t("household.tableHousehold")}</TableHead>
                        <TableHead>{t("household.table2fa")}</TableHead>
                        <TableHead>{t("household.tableJoined")}</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.provisionedUsers.map((p) => (
                        <TableRow key={p.userId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {initials(p.name, p.username)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{p.name ?? t("common.dash")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{p.username}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{p.householdName ?? t("common.dash")}</span>
                              <Badge variant="outline" className="text-xs">
                                {t("household.tenantBadge")}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-xs"
                              onClick={() => handleToggle2FA(p.userId, p.twoFactorEnabled)}
                              disabled={toggle2FA.isPending}
                            >
                              {p.twoFactorEnabled ? (
                                <ShieldCheck className="h-4 w-4 text-green-500" />
                              ) : (
                                <ShieldOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {fmtDate(p.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() =>
                                  setEditingMember({
                                    id: p.userId,
                                    userId: p.userId,
                                    name: p.name,
                                    email: p.username,
                                    image: null,
                                    role: "OWNER",
                                    joinedAt: p.createdAt,
                                    twoFactorEnabled: p.twoFactorEnabled,
                                    twoFactorConfigured: false,
                                  })
                                }
                                title={t("household.editUserTooltip")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleDeleteProvisioned(p.userId, p.name, p.username)
                                }
                                disabled={deleteProvisionedUser.isPending}
                                title={t("common.delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && (data?.pendingInvites.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("household.pendingInvites")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data?.pendingInvites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-col gap-2 text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>{t("household.inviteLink")}</span>
                  <div className="flex items-center justify-between gap-2 sm:justify-start">
                    <span className="text-xs">{t("household.inviteValidUntil", { date: fmtDate(inv.expiresAt) })}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleRevokeInvite(inv.id)}
                      disabled={revokeInvite.isPending}
                      title={t("household.revokeInvite")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
