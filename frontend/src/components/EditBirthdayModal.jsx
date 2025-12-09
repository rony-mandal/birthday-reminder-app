import { useState, useRef, useEffect } from "react";
import { X, Upload, Calendar, User, Heart, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RELATIONS = [
  "Friend",
  "Family",
  "Partner",
  "Colleague",
  "Parent",
  "Sibling",
  "Child",
  "Grandparent",
  "Other",
];

const EditBirthdayModal = ({ isOpen, birthday, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    relation: "",
    photo_url: "",
    custom_message: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (birthday) {
      setFormData({
        name: birthday.name || "",
        birth_date: birthday.birth_date || "",
        relation: birthday.relation || "",
        photo_url: birthday.photo_url || "",
        custom_message: birthday.custom_message || "",
      });
    }
  }, [birthday]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      const res = await axios.post(`${API}/upload-photo`, formDataObj);
      setFormData({ ...formData, photo_url: res.data.photo_url });
      toast.success("Photo updated!");
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.birth_date || !formData.relation) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/birthdays/${birthday.id}`, formData);
      toast.success("Birthday updated!");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update birthday");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="neo-card border-2 border-black max-w-md mx-auto p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-heading text-2xl font-black flex items-center gap-2">
            <span className="text-3xl">✏️</span> EDIT BIRTHDAY
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          {/* Photo Upload */}
          <div className="flex justify-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 border-2 border-dashed border-black rounded-lg cursor-pointer hover:border-coral transition-colors overflow-hidden flex items-center justify-center bg-cream"
              data-testid="edit-photo-upload"
            >
              {formData.photo_url ? (
                <img
                  src={formData.photo_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : uploading ? (
                <span className="text-sm text-gray-500">Uploading...</span>
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 mx-auto text-gray-400" />
                  <span className="text-xs text-gray-500">Add Photo</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block font-bold text-sm mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter name"
              className="neo-input w-full"
              data-testid="edit-birthday-name-input"
            />
          </div>

          {/* Birth Date */}
          <div>
            <label className="block font-bold text-sm mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Birth Date *
            </label>
            <Input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="neo-input w-full"
              data-testid="edit-birthday-date-input"
            />
          </div>

          {/* Relation */}
          <div>
            <label className="block font-bold text-sm mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Relationship *
            </label>
            <Select
              value={formData.relation}
              onValueChange={(value) => setFormData({ ...formData, relation: value })}
            >
              <SelectTrigger className="neo-input w-full" data-testid="edit-birthday-relation-select">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-black">
                {RELATIONS.map((relation) => (
                  <SelectItem key={relation} value={relation} className="hover:bg-lime cursor-pointer">
                    {relation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block font-bold text-sm mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Custom Wish Message (Optional)
            </label>
            <Textarea
              value={formData.custom_message}
              onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
              placeholder="Write a custom birthday message..."
              className="neo-input w-full min-h-[80px] py-3"
              data-testid="edit-birthday-message-input"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="neo-button-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="neo-button flex-1"
              data-testid="update-birthday-btn"
            >
              {loading ? "Updating..." : "Update Birthday"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBirthdayModal;
