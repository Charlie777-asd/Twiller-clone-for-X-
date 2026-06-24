import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, LinkIcon, MapPin, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import LoadingSpinner from "./loading-spinner";
import axiosInstance from "@/lib/axiosInstance";
import { mediaUrl } from "@/lib/backendUrl";
import { getErrorMessage } from "@/lib/types";

interface EditProfileProps {
  isopen: boolean;
  onclose: () => void;
}

const Editprofile = ({ isopen, onclose }: EditProfileProps) => {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormdata] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    website: user?.website || "",
    avatar: user?.avatar || "",
    coverImage: user?.coverImage || "",
  });
  const [error, setError] = useState<Record<string, string>>({});

  if (!isopen || !user) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = t("Display name is required") || "Display name is required";
    } else if (formData.displayName.length > 50) {
      newErrors.displayName = t("Display name must be 50 characters or less") || "Display name must be 50 characters or less";
    }

    if (formData.bio.length > 160) {
      newErrors.bio = t("Bio must be 160 characters or less") || "Bio must be 160 characters or less";
    }

    if (formData.website && formData.website.length > 100) {
      newErrors.website = t("Website must be 100 characters or less") || "Website must be 100 characters or less";
    }

    if (formData.location && formData.location.length > 30) {
      newErrors.location = t("Location must be 30 characters or less") || "Location must be 30 characters or less";
    }

    setError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;

    setIsLoading(true);
    try {
      await updateProfile(formData);
      onclose();
    } catch (err: unknown) {
      setError({ general: getErrorMessage(err, t("Failed to update profile. Please try again.") || "Failed to update profile. Please try again.") });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormdata((prev) => ({ ...prev, [field]: value }));
    if (error[field]) {
      setError((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsLoading(true);
    const image = e.target.files[0];
    const formDataImg = new FormData();
    formDataImg.set("image", image);
    try {
      const res = await axiosInstance.post(
        "/upload",
        formDataImg
      );
      const url = res.data.data.display_url;
      if (url) {
        setFormdata((prev) => ({ ...prev, avatar: url }));
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      setError({ general: t("Image upload failed. Please try again.") || "Image upload failed. Please try again." });
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsLoading(true);
    const image = e.target.files[0];
    const formDataImg = new FormData();
    formDataImg.set("image", image);
    try {
      const res = await axiosInstance.post("/upload", formDataImg);
      const url = res.data.data.display_url;
      if (url) {
        setFormdata((prev) => ({ ...prev, coverImage: url }));
      }
    } catch (err) {
      console.error("Cover image upload failed:", err);
      setError({ general: t("Cover image upload failed. Please try again.") || "Cover image upload failed. Please try again." });
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-black border-gray-800 text-white max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative pb-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white bg-black hover:bg-gray-900"
                onClick={onclose}
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl font-bold">{t("edit_profile") || "Edit profile"}</CardTitle>
            </div>
            <Button
              type="submit"
              form="edit-profile-form"
              className="bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>{t("Saving...") || "Saving..."}</span>
                </div>
              ) : (
                t("Save") || "Save"
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error.general && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm m-4">
              {error.general}
            </div>
          )}

          <form id="edit-profile-form" onSubmit={handleSubmit}>
            {/* Cover Photo */}
            <div className="relative">
              <div 
                className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative bg-cover bg-center"
                style={{ backgroundImage: formData.coverImage ? `url(${mediaUrl(formData.coverImage)})` : undefined }}
              >
                <input
                  type="file"
                  accept="image/*"
                  id="coverUpload"
                  className="hidden"
                  onChange={handleCoverUpload}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black/90"
                  disabled={isLoading}
                  onClick={() => document.getElementById("coverUpload")?.click()}
                >
                  <Camera className="h-6 w-6 text-white" />
                </Button>
              </div>

              {/* Profile Picture */}
              <div className="absolute -bottom-16 left-4">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-black">
                    <AvatarImage src={mediaUrl(formData.avatar)} alt={formData.displayName} />
                    <AvatarFallback className="text-2xl">
                      {formData.displayName?.[0] ?? user?.displayName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    accept="image/*"
                    id="avatarUpload"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black/90"
                    disabled={isLoading}
                    onClick={() =>
                      document.getElementById("avatarUpload")?.click()
                    }
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 mt-16 space-y-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-white">
                  {t("Name") || "Name"}
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    handleInputChange("displayName", e.target.value)
                  }
                  className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  placeholder={t("placeholder_display_name") || "Your display name"}
                  maxLength={50}
                  disabled={isLoading}
                />
                <div className="flex justify-between text-sm">
                  {error.displayName && (
                    <p className="text-red-400">{error.displayName}</p>
                  )}
                  <p className="text-gray-400 ml-auto">
                    {formData.displayName.length}/50
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white">
                  {t("Bio") || "Bio"}
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 resize-none min-h-[100px]"
                  placeholder={t("placeholder_bio") || "Tell the world about yourself"}
                  maxLength={160}
                  disabled={isLoading}
                />
                <div className="flex justify-between text-sm">
                  {error.bio && <p className="text-red-400">{error.bio}</p>}
                  <p className="text-gray-400 ml-auto">
                    {formData.bio.length}/160
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">
                  {t("Location") || "Location"}
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    placeholder={t("placeholder_location") || "Where are you located?"}
                    maxLength={30}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  {error.location && (
                    <p className="text-red-400">{error.location}</p>
                  )}
                  <p className="text-gray-400 ml-auto">
                    {formData.location.length}/30
                  </p>
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className="text-white">
                  {t("Website") || "Website"}
                </Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="website"
                    type="text"
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    placeholder={t("placeholder_website") || "Your website URL"}
                    maxLength={100}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  {error.website && (
                    <p className="text-red-400">{error.website}</p>
                  )}
                  <p className="text-gray-400 ml-auto">
                    {formData.website.length}/100
                  </p>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Editprofile;
