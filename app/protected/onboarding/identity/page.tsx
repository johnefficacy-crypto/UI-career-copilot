// app/onboarding/identity/page.tsx
import OnboardingLayout from "../layout";
import { saveIdentity } from "../actions";

export default function IdentityPage() {
  return (
    <OnboardingLayout step={1}>
      <h1>Tell us about yourself</h1>

      <form action={saveIdentity}>
        <label>
          Date of Birth
          <input type="date" name="dob" required />
        </label>

        <label>
          Gender
          <select name="gender" required>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          Category
          <select name="category" required>
            <option value="GEN">GEN</option>
            <option value="OBC">OBC</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
            <option value="EWS">EWS</option>
          </select>
        </label>

        <label>
          PwBD
          <select name="pwbd" required>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>

        <label>
          Domicile State
          <select name="domicile_state" required>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Delhi">Delhi</option>
            <option value="Karnataka">Karnataka</option>
            {/* ... all states */}
          </select>
        </label>

        <br />
        <button type="submit">Continue</button>
      </form>
    </OnboardingLayout>
  );
}