import React, { useState } from 'react';
import { UserCheck, Send, Phone, Mail, Building, User } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ContactShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendContact: (contactData: {
    contact_name: string;
    contact_phone?: string;
    contact_email?: string;
    organization?: string;
  }) => void;
}

export const ContactShareModal: React.FC<ContactShareModalProps> = ({
  isOpen,
  onClose,
  onSendContact,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSendContact({
      contact_name: name.trim(),
      contact_phone: phone.trim() || undefined,
      contact_email: email.trim() || undefined,
      organization: organization.trim() || undefined,
    });

    setName('');
    setPhone('');
    setEmail('');
    setOrganization('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Contact Card" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="Sarah Jenkins"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User className="w-4 h-4" />}
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="+1 555 987 6543"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={<Phone className="w-4 h-4" />}
        />

        <Input
          label="Email Address (Optional)"
          type="email"
          placeholder="sarah.jenkins@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Organization / Title (Optional)"
          type="text"
          placeholder="Acme Corp - Lead Designer"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          icon={<Building className="w-4 h-4" />}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            <Send className="w-4 h-4 mr-1.5" /> Share Contact
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ContactShareModal;
