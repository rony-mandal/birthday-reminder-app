import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gift, Calendar, Users, Send, Edit2, Trash2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import AddBirthdayModal from "../components/AddBirthdayModal";
import EditBirthdayModal from "../components/EditBirthdayModal";
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

const Dashboard = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(null);

  const fetchData = async () => {
    try {
      const [birthdaysRes, upcomingRes] = await Promise.all([
        axios.get(`${API}/birthdays`),
        axios.get(`${API}/birthdays/upcoming/list?days=30`),
      ]);
      setBirthdays(birthdaysRes.data);
      setUpcomingBirthdays(upcomingRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load birthdays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await axios.delete(`${API}/birthdays/${deletingId}`);
      toast.success("Birthday deleted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete birthday");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendReminder = async (id) => {
    setSendingReminder(id);
    try {
      await axios.post(`${API}/birthdays/${id}/send-reminder`);
      toast.success("Reminder sent successfully!");
    } catch (error) {
      const msg = error.response?.data?.detail || "Failed to send reminder";
      toast.error(msg);
    } finally {
      setSendingReminder(null);
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Stats
  const totalBirthdays = birthdays.length;
  const thisMonthCount = upcomingBirthdays.filter((b) => b.days_until <= 30).length;
  const todayCount = upcomingBirthdays.filter((b) => b.days_until === 0).length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="neo-card px-8 py-4">
            <p className="font-heading text-lg">Loading birthdays...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-black">
            DASHBOARD
          </h1>
          <p className="text-gray-600 mt-1 font-body">Keep track of all your special people</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="neo-button flex items-center gap-2 w-full sm:w-auto justify-center"
          data-testid="add-birthday-btn"
        >
          <Plus className="w-5 h-5" />
          Add Birthday
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="neo-card"
          data-testid="stat-total"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-lime border-2 border-black rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-heading font-black">{totalBirthdays}</p>
              <p className="text-sm text-gray-600">Total Birthdays</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="neo-card"
          data-testid="stat-upcoming"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sun border-2 border-black rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-heading font-black">{thisMonthCount}</p>
              <p className="text-sm text-gray-600">This Month</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`neo-card ${todayCount > 0 ? "birthday-today bg-coral/10" : ""}`}
          data-testid="stat-today"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-coral border-2 border-black rounded-lg flex items-center justify-center">
              <PartyPopper className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-heading font-black">{todayCount}</p>
              <p className="text-sm text-gray-600">Today!</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Birthdays - Large Card */}
        <div className="lg:col-span-2">
          <div className="neo-card h-full">
            <div className="flex items-center gap-2 mb-6">
              <Gift className="w-5 h-5 text-coral" />
              <h2 className="font-heading text-xl font-bold">UPCOMING BIRTHDAYS</h2>
            </div>

            {upcomingBirthdays.length === 0 ? (
              <div className="text-center py-12">
                <img
                  src="https://images.pexels.com/photos/4389637/pexels-photo-4389637.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt="Birthday cake"
                  className="w-48 h-48 object-cover mx-auto empty-state-img rounded-lg mb-6"
                />
                <p className="text-gray-600 font-body">No upcoming birthdays in the next 30 days</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="neo-button-secondary mt-4"
                  data-testid="empty-add-btn"
                >
                  Add Your First Birthday
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                <AnimatePresence>
                  {upcomingBirthdays.map((birthday, index) => (
                    <motion.div
                      key={birthday.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-4 p-4 border-2 border-black rounded-lg bg-white hover:bg-cream transition-colors birthday-card ${
                        birthday.days_until === 0 ? "birthday-today" : ""
                      }`}
                      data-testid={`birthday-card-${birthday.id}`}
                    >
                      {/* Photo */}
                      <div className="w-14 h-14 rounded-lg border-2 border-black overflow-hidden flex-shrink-0">
                        {birthday.photo_url ? (
                          <img
                            src={birthday.photo_url}
                            alt={birthday.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="photo-placeholder w-full h-full">
                            {getInitials(birthday.name)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{birthday.name}</h3>
                        <p className="text-sm text-gray-600">
                          {birthday.relation} • Turning {birthday.age}
                        </p>
                      </div>

                      {/* Countdown Badge */}
                      <div
                        className={`px-3 py-1 border-2 border-black rounded-full font-bold text-xs ${
                          birthday.days_until === 0
                            ? "bg-coral text-white"
                            : birthday.days_until <= 7
                            ? "bg-sun"
                            : "bg-lime"
                        }`}
                      >
                        {birthday.days_until === 0
                          ? "TODAY!"
                          : birthday.days_until === 1
                          ? "TOMORROW"
                          : `${birthday.days_until} DAYS`}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendReminder(birthday.id)}
                          disabled={sendingReminder === birthday.id}
                          className="p-2 border-2 border-black rounded-md bg-white hover:bg-lime transition-colors disabled:opacity-50"
                          title="Send Reminder"
                          data-testid={`send-reminder-${birthday.id}`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* All Birthdays List */}
        <div className="lg:col-span-1">
          <div className="neo-card h-full">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-lime" />
              <h2 className="font-heading text-xl font-bold">ALL BIRTHDAYS</h2>
            </div>

            {birthdays.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No birthdays added yet</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {birthdays.map((birthday) => (
                  <div
                    key={birthday.id}
                    className="flex items-center gap-3 p-3 border-2 border-black rounded-lg bg-white hover:bg-cream transition-colors"
                    data-testid={`all-birthday-${birthday.id}`}
                  >
                    {/* Small Photo */}
                    <div className="w-10 h-10 rounded-lg border-2 border-black overflow-hidden flex-shrink-0">
                      {birthday.photo_url ? (
                        <img
                          src={birthday.photo_url}
                          alt={birthday.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="photo-placeholder w-full h-full text-sm">
                          {getInitials(birthday.name)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{birthday.name}</h4>
                      <p className="text-xs text-gray-600">{formatDate(birthday.birth_date)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingBirthday(birthday)}
                        className="p-1.5 border-2 border-black rounded bg-white hover:bg-sun transition-colors"
                        data-testid={`edit-${birthday.id}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeletingId(birthday.id)}
                        className="p-1.5 border-2 border-black rounded bg-white hover:bg-coral hover:text-white transition-colors"
                        data-testid={`delete-${birthday.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Birthday Modal */}
      <AddBirthdayModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchData();
        }}
      />

      {/* Edit Birthday Modal */}
      {editingBirthday && (
        <EditBirthdayModal
          isOpen={!!editingBirthday}
          birthday={editingBirthday}
          onClose={() => setEditingBirthday(null)}
          onSuccess={() => {
            setEditingBirthday(null);
            fetchData();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent className="neo-card border-2 border-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Birthday?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this birthday entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neo-button-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="neo-button bg-coral"
              data-testid="confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
