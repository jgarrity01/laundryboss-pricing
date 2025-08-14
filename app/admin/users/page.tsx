"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, UserPlus, Edit, Key } from "lucide-react"
import Link from "next/link"

interface User {
  id: string
  email: string
  user_metadata: { role?: string }
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState<User | null>(null)
  const [showChangePassword, setShowChangePassword] = useState<User | null>(null)

  // Form states
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserRole, setNewUserRole] = useState("viewer")
  const [editUserRole, setEditUserRole] = useState("")
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/users")
      if (!response.ok) throw new Error("Failed to load users")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const addUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      })

      if (!response.ok) throw new Error("Failed to create user")

      setNewUserEmail("")
      setNewUserPassword("")
      setNewUserRole("viewer")
      setShowAddUser(false)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create user")
    }
  }

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) throw new Error("Failed to update user")

      setShowEditUser(null)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user")
    }
  }

  const changePassword = async (userId: string, password: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) throw new Error("Failed to change password")

      setNewPassword("")
      setShowChangePassword(null)
      alert("Password changed successfully")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change password")
    }
  }

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}?`)) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete user")

      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "superuser":
        return "bg-red-100 text-red-800"
      case "admin":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        <p>Loading users...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={loadUsers}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superuser">Superuser</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addUser} disabled={!newUserEmail || !newUserPassword}>
                    Create User
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddUser(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Link href="/admin">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Created</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge className={getRoleBadgeColor(user.user_metadata?.role || "viewer")}>
                        {user.user_metadata?.role || "viewer"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowEditUser(user)
                            setEditUserRole(user.user_metadata?.role || "viewer")
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowChangePassword(user)}>
                          <Key className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No users found. Add your first user to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Role Dialog */}
      <Dialog open={!!showEditUser} onOpenChange={() => setShowEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          {showEditUser && (
            <div className="space-y-4">
              <p>User: {showEditUser.email}</p>
              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select value={editUserRole} onValueChange={setEditUserRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superuser">Superuser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => updateUserRole(showEditUser.id, editUserRole)}>Update Role</Button>
                <Button variant="outline" onClick={() => setShowEditUser(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={!!showChangePassword} onOpenChange={() => setShowChangePassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          {showChangePassword && (
            <div className="space-y-4">
              <p>User: {showChangePassword.email}</p>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => changePassword(showChangePassword.id, newPassword)} disabled={!newPassword}>
                  Change Password
                </Button>
                <Button variant="outline" onClick={() => setShowChangePassword(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
