import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Plus, Trash2, Send, Key, AtSign, FileText, Save, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const [emailSettings, setEmailSettings] = useState({
    gmail_address: "",
    app_password: "",
    recipient_emails: [],
    is_configured: false,
  });
  const [newRecipient, setNewRecipient] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", subject: "", body: "" });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [emailRes, templatesRes] = await Promise.all([
        axios.get(`${API}/settings/email`),
        axios.get(`${API}/templates`),
      ]);
      setEmailSettings({
        ...emailRes.data,
        app_password: "", // Don't show stored password
      });
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!emailSettings.gmail_address) {
      toast.error("Please enter a Gmail address");
      return;
    }
    if (!emailSettings.app_password && !emailSettings.is_configured) {
      toast.error("Please enter an app password");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        gmail_address: emailSettings.gmail_address,
        recipient_emails: emailSettings.recipient_emails,
      };
      if (emailSettings.app_password) {
        payload.app_password = emailSettings.app_password;
      }

      if (emailSettings.is_configured) {
        await axios.put(`${API}/settings/email`, payload);
      } else {
        payload.app_password = emailSettings.app_password;
        await axios.post(`${API}/settings/email`, payload);
      }
      toast.success("Email settings saved!");
      fetchSettings();
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecipient = () => {
    if (!newRecipient) return;
    if (!newRecipient.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (emailSettings.recipient_emails.includes(newRecipient)) {
      toast.error("Email already added");
      return;
    }
    setEmailSettings({
      ...emailSettings,
      recipient_emails: [...emailSettings.recipient_emails, newRecipient],
    });
    setNewRecipient("");
  };

  const handleRemoveRecipient = (email) => {
    setEmailSettings({
      ...emailSettings,
      recipient_emails: emailSettings.recipient_emails.filter((e) => e !== email),
    });
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      await axios.post(`${API}/settings/email/test`);
      toast.success("Test email sent! Check your inbox.");
    } catch (error) {
      const msg = error.response?.data?.detail || "Failed to send test email";
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
      toast.error("Please fill all template fields");
      return;
    }
    try {
      await axios.post(`${API}/templates`, newTemplate);
      toast.success("Template created!");
      setNewTemplate({ name: "", subject: "", body: "" });
      setShowNewTemplate(false);
      fetchSettings();
    } catch (error) {
      toast.error("Failed to create template");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    try {
      await axios.delete(`${API}/templates/${deletingTemplate}`);
      toast.success("Template deleted!");
      fetchSettings();
    } catch (error) {
      toast.error("Failed to delete template");
    } finally {
      setDeletingTemplate(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="neo-card px-8 py-4">
            <p className="font-heading text-lg">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="settings-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-black">
          SETTINGS
        </h1>
        <p className="text-gray-600 mt-1 font-body">Configure your email and notification preferences</p>
      </div>

      {/* Email Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="neo-card mb-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Mail className="w-5 h-5 text-coral" />
          <h2 className="font-heading text-xl font-bold">EMAIL CONFIGURATION</h2>
          {emailSettings.is_configured && (
            <span className="neo-badge bg-lime ml-auto">CONFIGURED</span>
          )}
        </div>

        <div className="space-y-4">
          {/* Gmail Address */}
          <div>
            <label className="block font-bold text-sm mb-2 flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              Gmail Address
            </label>
            <Input
              type="email"
              value={emailSettings.gmail_address}
              onChange={(e) =>
                setEmailSettings({ ...emailSettings, gmail_address: e.target.value })
              }
              placeholder="your-email@gmail.com"
              className="neo-input w-full"
              data-testid="gmail-address-input"
            />
          </div>

          {/* App Password */}
          <div>
            <label className="block font-bold text-sm mb-2 flex items-center gap-2">
              <Key className="w-4 h-4" />
              App Password
              {emailSettings.is_configured && (
                <span className="text-xs font-normal text-gray-500">(leave blank to keep current)</span>
              )}
            </label>
            <Input
              type="password"
              value={emailSettings.app_password}
              onChange={(e) =>
                setEmailSettings({ ...emailSettings, app_password: e.target.value })
              }
              placeholder="••••••••••••••••"
              className="neo-input w-full"
              data-testid="app-password-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Generate at: Google Account → Security → 2-Step Verification → App passwords
            </p>
          </div>

          {/* Recipient Emails */}
          <div>
            <label className="block font-bold text-sm mb-2">Recipient Emails</label>
            <p className="text-xs text-gray-500 mb-3">
              Add email addresses that should receive birthday reminders
            </p>

            <div className="flex gap-2 mb-3">
              <Input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="Add recipient email"
                className="neo-input flex-1"
                onKeyPress={(e) => e.key === "Enter" && handleAddRecipient()}
                data-testid="new-recipient-input"
              />
              <button
                onClick={handleAddRecipient}
                className="neo-button-secondary px-4"
                data-testid="add-recipient-btn"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {emailSettings.recipient_emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emailSettings.recipient_emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-2 px-3 py-1 bg-lime border-2 border-black rounded-full text-sm"
                  >
                    <span>{email}</span>
                    <button
                      onClick={() => handleRemoveRecipient(email)}
                      className="hover:text-coral"
                      data-testid={`remove-recipient-${email}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-dashed border-black">
            <button
              onClick={handleSaveEmail}
              disabled={saving}
              className="neo-button flex items-center gap-2"
              data-testid="save-email-btn"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {emailSettings.is_configured && (
              <button
                onClick={handleTestEmail}
                disabled={testing}
                className="neo-button-secondary flex items-center gap-2"
                data-testid="test-email-btn"
              >
                <Send className="w-4 h-4" />
                {testing ? "Sending..." : "Send Test Email"}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Message Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="neo-card"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-lime" />
            <h2 className="font-heading text-xl font-bold">MESSAGE TEMPLATES</h2>
          </div>
          <button
            onClick={() => setShowNewTemplate(!showNewTemplate)}
            className="neo-button-secondary px-4 py-2 text-sm"
            data-testid="add-template-btn"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* New Template Form */}
        {showNewTemplate && (
          <div className="mb-6 p-4 bg-sun/20 border-2 border-black rounded-lg">
            <h3 className="font-bold mb-3">Create New Template</h3>
            <div className="space-y-3">
              <Input
                placeholder="Template Name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="neo-input w-full"
                data-testid="template-name-input"
              />
              <Input
                placeholder="Email Subject (use {name} for placeholder)"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                className="neo-input w-full"
                data-testid="template-subject-input"
              />
              <Textarea
                placeholder="Email Body (use {name} for placeholder)"
                value={newTemplate.body}
                onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                className="neo-input w-full min-h-[100px] py-3"
                data-testid="template-body-input"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTemplate}
                  className="neo-button text-sm"
                  data-testid="save-template-btn"
                >
                  Save Template
                </button>
                <button
                  onClick={() => {
                    setShowNewTemplate(false);
                    setNewTemplate({ name: "", subject: "", body: "" });
                  }}
                  className="neo-button-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template List */}
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-4 border-2 border-black rounded-lg bg-white hover:bg-cream transition-colors"
              data-testid={`template-${template.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{template.name}</h3>
                    {template.is_default && (
                      <span className="text-xs bg-lime px-2 py-0.5 border border-black rounded">DEFAULT</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Subject:</strong> {template.subject}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.body}</p>
                </div>
                {!template.is_default && (
                  <button
                    onClick={() => setDeletingTemplate(template.id)}
                    className="p-2 border-2 border-black rounded bg-white hover:bg-coral hover:text-white transition-colors"
                    data-testid={`delete-template-${template.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Delete Template Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent className="neo-card border-2 border-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this message template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neo-button-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="neo-button bg-coral"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
